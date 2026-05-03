import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdaptiveQuestionNode } from './schema/adaptive-node.schema';
import { AdaptiveQuestionTree } from './schema/adaptive-tree.schema';
import { StartAdaptiveDto } from './dto/start-adaptive.dto';
import { AnswerAdaptiveDto } from './dto/answer-adaptive.dto';
import { AssessmentMode, AssessmentStatus } from '@prisma/client';

import { ScoringEngineService } from '../scoring/services/scoring-engine.service';
import { InsightGenerationService } from '../scoring/services/insight-generation.service';

@Injectable()
export class AdaptiveService {
  private readonly logger = new Logger(AdaptiveService.name);

  constructor(
    private prisma: PrismaService,
    private scoringEngine: ScoringEngineService,
    private insightService: InsightGenerationService,
    @InjectModel(AdaptiveQuestionTree.name) private treeModel: Model<AdaptiveQuestionTree>,
    @InjectModel(AdaptiveQuestionNode.name) private nodeModel: Model<AdaptiveQuestionNode>,
  ) {}

  /**
   * Initializes a new Adaptive Questionnaire Session for a user.
   */
  async startSession(userId: string, dto: StartAdaptiveDto) {
    const tree = await this.treeModel.findOne({ treeId: dto.treeId, isActive: true });
    if (!tree) throw new NotFoundException('Questionnaire tree not found');

    const startingNode = await this.nodeModel.findOne({ questionId: tree.startingQuestionId });
    if (!startingNode) throw new NotFoundException('Starting question node not found');

    const session = await this.prisma.adaptiveSession.create({
      data: {
        userId,
        mode: dto.mode || AssessmentMode.STANDARD,
        currentScore: 0,
        status: AssessmentStatus.IN_PROGRESS,
        dimensionalScores: {},
      },
    });

    return {
      sessionId: session.id,
      mode: session.mode,
      nextQuestion: this.sanitizeNode(startingNode),
      progress: 0,
    };
  }

  /**
   * Submits an answer, evaluates the branching logic internally, and determines the next question.
   */
  async submitAnswer(userId: string, dto: AnswerAdaptiveDto) {
    const session = await this.prisma.adaptiveSession.findFirst({
      where: { id: dto.sessionId, userId },
      include: { responses: true }
    });

    if (!session) throw new NotFoundException('Active session not found');
    if (session.status !== AssessmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is already ' + session.status);
    }

    // Save Response
    const response = await this.prisma.adaptiveResponse.create({
      data: {
        sessionId: session.id,
        questionId: dto.questionId,
        score: dto.score,
        textValue: dto.textValue,
        timeTaken: dto.timeTaken,
      },
    });

    // Update Dimensional Scores Dynamically
    const currentNodeForScore = await this.nodeModel.findOne({ questionId: dto.questionId });
    if (currentNodeForScore && currentNodeForScore.category && dto.score !== undefined) {
      const currentDims = (session.dimensionalScores as Record<string, number>) || {};
      const weightedScore = dto.score * (currentNodeForScore.severityWeight || 1.0);
      currentDims[currentNodeForScore.category] = (currentDims[currentNodeForScore.category] || 0) + weightedScore;
      
      await this.prisma.adaptiveSession.update({
        where: { id: session.id },
        data: { 
          currentScore: session.currentScore + weightedScore, 
          dimensionalScores: currentDims 
        }
      });
    }

    // Determine Next Question using Graph Logic
    const nextQuestion = await this.determineNextQuestion(dto.questionId, dto.score, session.id);

    if (!nextQuestion) {
      // Mark as complete
      const completedSession = await this.prisma.adaptiveSession.update({
        where: { id: session.id },
        data: { status: AssessmentStatus.COMPLETED, completedAt: new Date() },
      });

      // --- PHASE 5: TRIGGER MULTI-DIMENSIONAL SCORING ---
      const dims = (completedSession.dimensionalScores as Record<string, number>) || {};
      
      // Map session categories to 5 Core Dimensions
      // For the clinical engine, we normalize the raw accumulated points into a percentage scale (0-100)
      const vector = {
        emotional: Math.min(100, (dims['ANXIETY'] || 0) * 0.5 + (dims['DEPRESSION'] || 0) * 0.5),
        cognitive: Math.min(100, (dims['ANXIETY'] || 0) * 0.8),
        behavioral: Math.min(100, (dims['DEPRESSION'] || 0) * 0.8),
        physiological: Math.min(100, (dims['ANXIETY'] || 0) * 0.3 + (dims['DEPRESSION'] || 0) * 0.3),
        temporal: 50, // Default baseline for temporal drift
      };

      const scoreRecord = await this.scoringEngine.calculateAndSaveScore(
        userId, 
        vector, 
        completedSession.crisisFlag
      );

      const insight = await this.insightService.generateInsight(scoreRecord.id);

      return { 
        completed: true, 
        scoreId: scoreRecord.id,
        summary: insight.insightText,
        fullResult: scoreRecord 
      };
    }

    return {
      completed: false,
      nextQuestion: this.sanitizeNode(nextQuestion),
      progress: this.calculateApproximateProgress(session.responses.length)
    };
  }

  /**
   * Internal Rule Evaluator
   */
  private async determineNextQuestion(currentQuestionId: string, currentScore: number | undefined, sessionId: string): Promise<AdaptiveQuestionNode | null> {
    const currentNode = await this.nodeModel.findOne({ questionId: currentQuestionId });
    if (!currentNode) return null;

    // 1. Evaluate explicit follow-up branch overrides based on immediate score
    if (currentNode.followUpRules && currentNode.followUpRules.length > 0) {
      for (const rule of currentNode.followUpRules) {
        // Simple direct mapping
        if (rule.answer === currentScore) {
          const matchedBranch = await this.nodeModel.findOne({ questionId: rule.nextQId });
          if (matchedBranch) return matchedBranch;
        }
      }
    }

    // 2. Default: evaluate normal child nodes
    if (currentNode.childQuestionIds && currentNode.childQuestionIds.length > 0) {
      for (const childId of currentNode.childQuestionIds) {
        const potentialNode = await this.nodeModel.findOne({ questionId: childId });
        if (potentialNode) {
          // If the child node has dependency rules, we must fetch session history to verify
          if (potentialNode.dependencyRules && potentialNode.dependencyRules.length > 0) {
             const canProceed = await this.evaluateDependencies(potentialNode.dependencyRules, sessionId);
             if (canProceed) return potentialNode;
             // If false, continue checking the next possible child childId
             continue;
          }
          return potentialNode; 
        }
      }
    }

    // Leaf node reached
    return null;
  }

  private async evaluateDependencies(rules: any[], sessionId: string): Promise<boolean> {
    // Basic AST Evaluator: Retrieves previous answers from Postgres to check operators
    const responses = await this.prisma.adaptiveResponse.findMany({ where: { sessionId } });
    
    for (const rule of rules) {
      const pastAns = responses.find(r => r.questionId === rule.prevQId);
      if (!pastAns) return false; // Dependent question was never answered

      switch (rule.operator) {
        case '>=': if (!(pastAns.score! >= rule.value)) return false; break;
        case '<': if (!(pastAns.score! < rule.value)) return false; break;
        case '==': if (!(pastAns.score! === rule.value)) return false; break;
        default: return false;
      }
    }
    return true; // All rules passed
  }

  private sanitizeNode(node: AdaptiveQuestionNode) {
    const { _id, id, dependencyRules, followUpRules, targetUsers, ...clientReady } = node.toObject();
    return { ...clientReady };
  }

  private calculateApproximateProgress(answeredCount: number): number {
    // Dynamic trees make absolute percentages impossible, so we use asymptotic log calculation
    return Math.min(0.95, (answeredCount / (answeredCount + 5))); 
  }
}
