import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiPredictionType, AiInsightStatus, CrisisRiskLevel } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);
  private readonly PROMPT_VERSION = '3.0';
  private readonly MODEL_NAME = 'llama3:latest';

  constructor(private prisma: PrismaService) {}

  /**
   * Main entry point to generate or retrieve a cached AI Insight
   */
  async generateInsight(
    userId: string,
    type: AiPredictionType,
    predictionData: {
      score: number;
      riskLevel: string;
      topFactors: string[];
      rawInput: any;
    },
  ) {
    const insightHash = this.calculateHash(userId, type, predictionData);

    // 1. Check Cache (Improvement #5)
    const existingInsight = await this.prisma.aiInsight.findFirst({
      where: {
        insightHash,
        status: AiInsightStatus.COMPLETED,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24h cache (Improvement #9)
      },
    });

    if (existingInsight) {
      this.logger.log(`Reusing cached insight for user ${userId} [${type}]`);
      return existingInsight;
    }

    // 2. Initial DB Entry (Status: GENERATING) (Improvement #6)
    const insight = await this.prisma.aiInsight.create({
      data: {
        userId,
        predictionType: type,
        status: AiInsightStatus.GENERATING,
        riskLevel: this.mapToCrisisRisk(predictionData.riskLevel),
        insightHash,
        languageCode: 'en', // Improvement #8
        metadata: {
          modelScore: predictionData.score,
          topFactors: predictionData.topFactors,
        },
      },
    });

    // 3. Trigger Asynchronous Generation
    this.processGeneration(insight.id, userId, type, predictionData);

    return insight;
  }

  private async processGeneration(
    insightId: string,
    userId: string,
    type: AiPredictionType,
    data: any,
  ) {
    const startTime = Date.now();
    try {
      // Collect Context (Improvement #2)
      const context = await this.collectUserContext(userId);
      const dataCompleteness = this.calculateDataCompleteness(context);

      // Hard Crisis Guardrail (Safety Decision)
      const isCrisisOverride = data.score > 0.8 || data.riskLevel === 'CRITICAL';

      // Call AI Hub
      const aiServiceUrl = process.env.AI_SERVICE_URL;
      if (!aiServiceUrl) {
        this.logger.error('AI_SERVICE_URL is missing in AiInsightService');
      }
      const response = await axios.post(
        `${aiServiceUrl}/insights/generate`,
        {
          userId,
          predictionType: type,
          modelData: data,
          context,
          promptVersion: this.PROMPT_VERSION,
        },
        { 
          timeout: 45000,
          headers: {
            'X-Bridge-Secret': process.env.FASTAPI_BRIDGE_SECRET,
            'Content-Type': 'application/json'
          }
        },
      );

      const llmOutput = response.data;
      const latencyMs = Date.now() - startTime;

      // Update with Success (Improvement #1, #2, #3)
      await this.prisma.aiInsight.update({
        where: { id: insightId },
        data: {
          status: isCrisisOverride ? AiInsightStatus.CRISIS_OVERRIDE : AiInsightStatus.COMPLETED,
          headline: llmOutput.headline,
          summary: llmOutput.summary,
          reasonCodes: llmOutput.reasonCodes || [],
          confidenceMatrix: {
            mlScore: data.score,
            llmScore: llmOutput.confidence || 0.85,
            dataCompleteness,
          },
          content: {
            analysis: llmOutput.analysis,
            actions: llmOutput.actions, // { immediate, 24h, weekly }
            suggestions: llmOutput.suggestions, // { toolId, cta }
          },
          observability: {
            promptVersion: this.PROMPT_VERSION,
            modelName: this.MODEL_NAME,
            latencyMs,
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day expiry (Improvement #9)
        },
      });
    } catch (error) {
      this.logger.error(`Generation failed for ${insightId}: ${error.message}`);
      await this.useFallbackTemplate(insightId, type, data);
    }
  }

  private async useFallbackTemplate(insightId: string, type: AiPredictionType, data: any) {
    // Improvement #4: Fallback Templates
    const fallback = {
      headline: `Analysis for your ${type.toLowerCase()} check-in`,
      summary: `Our AI is currently busy, but your score of ${Math.round(data.score * 100)}% suggests you should focus on rest and recovery.`,
      analysis: 'We were unable to generate a deep analysis at this moment. However, based on your inputs, we recommend monitoring your stress levels closely.',
      actions: {
        immediate: ['Take 5 deep breaths'],
        '24h': ['Aim for 8 hours of sleep'],
        weekly: ['Review your mood trends'],
      },
    };

    await this.prisma.aiInsight.update({
      where: { id: insightId },
      data: {
        status: AiInsightStatus.FALLBACK_USED,
        headline: fallback.headline,
        summary: fallback.summary,
        content: fallback,
      },
    });
  }

  private calculateHash(userId: string, type: string, data: any): string {
    const payload = JSON.stringify({
      userId,
      type,
      score: data.score,
      factors: [...data.topFactors].sort(),
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private async collectUserContext(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const recentLogs = await this.prisma.moodLog.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    return {
      age: profile?.ageRange,
      gender: profile?.gender,
      recentMoodAvg: recentLogs.reduce((acc, l) => acc + l.score, 0) / (recentLogs.length || 1),
      logCount: recentLogs.length,
    };
  }

  private calculateDataCompleteness(context: any): number {
    let score = 0;
    if (context.age) score += 0.25;
    if (context.gender) score += 0.25;
    if (context.logCount >= 5) score += 0.5;
    else score += (context.logCount / 5) * 0.5;
    return score;
  }

  private mapToCrisisRisk(risk: string): CrisisRiskLevel {
    const map = {
      LOW: CrisisRiskLevel.LOW,
      MEDIUM: CrisisRiskLevel.MED,
      HIGH: CrisisRiskLevel.HIGH,
      CRITICAL: CrisisRiskLevel.SEVERE,
    };
    return map[risk] || CrisisRiskLevel.LOW;
  }
}
