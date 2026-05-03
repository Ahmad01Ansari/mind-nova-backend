import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SubmitAssessmentDto, SaveProgressDto } from './dto/assessment.dto';
import { Questionnaire, QuestionnaireDocument, AssessmentSession, AssessmentSessionDocument } from './schema/assessment.schema';

import { ScoringEngineService } from '../scoring/services/scoring-engine.service';
import { InsightGenerationService } from '../scoring/services/insight-generation.service';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private scoringEngine: ScoringEngineService,
    private insightGeneration: InsightGenerationService,
    @InjectModel(Questionnaire.name) private questionnaireModel: Model<QuestionnaireDocument>,
    @InjectModel(AssessmentSession.name) private sessionModel: Model<AssessmentSessionDocument>,
  ) {}

  async findAll() {
    return this.prisma.assessment.findMany();
  }

  async findOne(id: string) {
    let assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      const slugMap: Record<string, string[]> = {
        'phq9': ['Depression (PHQ-9)', 'PHQ-9 Depression Test', 'Depression'],
        'depression': ['Depression (PHQ-9)', 'PHQ-9 Depression Test', 'Depression'],
        'gad7': ['Anxiety (GAD-7)', 'Anxiety'],
        'anxiety': ['Anxiety (GAD-7)', 'Anxiety'],
        'pss': ['Stress (PSS)', 'Stress (PSS-10)', 'Stress'],
        'stress': ['Stress (PSS)', 'Stress (PSS-10)', 'Stress'],
        'pcl5': ['PTSD (PCL-5)', 'PTSD'],
        'ptsd': ['PTSD (PCL-5)', 'PTSD'],
        'pdss': ['Panic (PDSS)', 'Panic'],
        'panic': ['Panic (PDSS)', 'Panic']
      };

      const titles = slugMap[id.toLowerCase()];
      if (titles) {
        assessment = await this.prisma.assessment.findFirst({
          where: { title: { in: titles, mode: 'insensitive' } },
        });
      }
      
      // Secondary fallback: case-insensitive search if still not found
      if (!assessment) {
        assessment = await this.prisma.assessment.findFirst({
          where: { title: { contains: id, mode: 'insensitive' } },
        });
      }
    }

    if (!assessment) throw new NotFoundException('Assessment not found');
    
    // Normalize slug for Mongo lookup (e.g. "phq9" -> "phq-9", "GAD-7" -> "gad-7")
    const searchSlugs = [
      id.toLowerCase(),
      id.toLowerCase().replace(/(\d+)/, '-$1'), // phq9 -> phq-9
      assessment.title.toLowerCase().replace(/\s+/g, '-'), // "Depression (PHQ-9)" -> "depression-(phq-9)"
      assessment.title.split('(')[0].trim().toLowerCase().replace(/\s+/g, '-'), // "Depression"
      id.toLowerCase().replace('-', ''), // phq-9 -> phq9
    ];

    // Try finding the clinical structure in MongoDB
    const structure = await this.questionnaireModel.findOne({ 
      slug: { $in: [...new Set(searchSlugs)] } 
    });
    
    return { 
      ...assessment, 
      slug: structure?.slug ?? id,
      questions: structure?.questions ?? [],
    };
  }

  async getAllSessions(userId: string) {
    return this.sessionModel.find({ userId }).exec();
  }

  async getSession(userId: string, assessmentId: string) {
    return this.sessionModel.findOne({ userId, assessmentId }).exec();
  }

  async startSession(userId: string, assessmentId: string, depth: string = 'standard') {
    let session = await this.getSession(userId, assessmentId);
    if (session) return session;

    const assessment = await this.findOne(assessmentId);
    if (!assessment.questions || assessment.questions.length === 0) {
      throw new NotFoundException('Assessment structure not found or has no questions');
    }

    const allQuestionIds = assessment.questions.map(q => q.id);
    const shuffledIds = this._shuffleArray([...allQuestionIds]);

    let limit = 12;
    if (depth === 'short') limit = 6;
    if (depth === 'advanced') limit = 20;
    
    const selectedIds = shuffledIds.slice(0, limit);

    return this.sessionModel.create({
      userId,
      assessmentId,
      slug: assessment.slug,
      shuffledQuestionIds: selectedIds,
      depth,
      answers: {},
      currentIndex: 0,
    });
  }

  async saveProgress(userId: string, assessmentId: string, dto: SaveProgressDto) {
    return this.sessionModel.findOneAndUpdate(
      { userId, assessmentId },
      { 
        $set: { 
          answers: dto.answers, 
          currentIndex: dto.currentIndex,
          metadata: dto.metadata 
        } 
      },
      { new: true, upsert: true }
    ).exec();
  }

  async submitAnswers(userId: string, assessmentId: string, dto: SubmitAssessmentDto) {
    const assessment = await this.findOne(assessmentId);

    if (!assessment.questions || assessment.questions.length === 0) {
      const totalScore = Object.values(dto.answers).reduce((acc, val) => acc + (val as number), 0);
      return this.saveScore(userId, assessmentId, totalScore, 'Normal');
    }

    const categoryScores: Record<string, any> = {};
    
    assessment.questions.forEach(q => {
      const answer = dto.answers[q.id];
      if (answer !== undefined) {
        if (!categoryScores[q.category]) {
          categoryScores[q.category] = { total: 0, max: 0 };
        }
        categoryScores[q.category].total += answer;
        categoryScores[q.category].max += 3; 
      }
    });

    const totalScore = Object.values(categoryScores).reduce((acc, val) => acc + val.total, 0);
    const severityLevel = this.calculateSeverity(totalScore);

    // --- PHASE 5: UNIFIED CLINICAL MAPPING ---
    // Extract a 5-dimension vector from any standard clinical assessment metadata
    const vector = {
      emotional: this._mapToDimension(['Mood', 'Anxiety', 'Interest', 'Guilt'], categoryScores),
      cognitive: this._mapToDimension(['Concentration', 'Worry', 'Control', 'Self-Esteem'], categoryScores),
      behavioral: this._mapToDimension(['Behavior', 'Psychomotor', 'Appetite'], categoryScores),
      physiological: this._mapToDimension(['Sleep', 'Energy', 'Somatic', 'Physical'], categoryScores),
      temporal: 50, // Snapshot baseline
    };

    const scoringRecord = await this.scoringEngine.calculateAndSaveScore(userId, vector);
    const aiInsight = await this.insightGeneration.generateInsight(scoringRecord.id);

    // Merge legacy and Phase 5 data for complete compatibility
    const result = {
      ...scoringRecord,
      totalScore,
      severityLevel,
      metadata: {
        ...categoryScores,
        // Dimension scores for UI Radar Chart
        Emotional: scoringRecord.emotional,
        Cognitive: scoringRecord.cognitive,
        Behavioral: scoringRecord.behavioral,
        Physiological: scoringRecord.physiological,
        Temporal: scoringRecord.temporal,
        ai_insight: aiInsight.insightText,
      },
      assessment: assessment,
      insight: aiInsight.insightText,
      calculatedAt: scoringRecord.calculatedAt,
    };

    // Keep Prisma AssessmentScore for history fallback
    await this.prisma.assessmentScore.create({
      data: {
        userId,
        assessmentId: assessment.id,
        totalScore,
        severityLevel,
        metadata: result.metadata,
      },
    });

    await this.sessionModel.deleteOne({ userId, assessmentId }).exec();

    return result;
  }

  private _mapToDimension(clinicalLabels: string[], scores: Record<string, any>): number {
    let total = 0;
    let count = 0;
    clinicalLabels.forEach(label => {
      const matchKey = Object.keys(scores).find(k => k.toLowerCase() === label.toLowerCase());
      if (matchKey && scores[matchKey].max > 0) {
        total += (scores[matchKey].total / scores[matchKey].max) * 100;
        count++;
      }
    });
    return count > 0 ? total / count : 30; // 30 is the healthy baseline for unmeasured dimensions
  }

  async getHistory(userId: string) {
    return this.prisma.assessmentScore.findMany({
      where: { userId },
      include: { assessment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private calculateSeverity(score: number): string {
    if (score >= 20) return 'Severe';
    if (score >= 15) return 'Moderately Severe';
    if (score >= 10) return 'Moderate';
    if (score >= 5) return 'Mild';
    return 'Minimal';
  }

  private async saveScore(userId: string, assessmentId: string, totalScore: number, severity: string) {
    const assessment = await this.findOne(assessmentId);
    return this.prisma.assessmentScore.create({
      data: {
        userId,
        assessmentId: assessment.id,
        totalScore,
        severityLevel: severity,
      },
      include: {
        assessment: true,
      },
    });
  }

  private _shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
