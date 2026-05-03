import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StartRecoveryDto, CompleteRecoveryDto } from './dto/recovery.dto';

@Injectable()
export class RecoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessions(category?: string) {
    return this.prisma.recoverySession.findMany({
      where: category ? { category } : {},
      include: { 
        stages: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startSession(userId: string, dto: StartRecoveryDto) {
    const session = await this.prisma.recoverySession.findUnique({
      where: { id: dto.sessionId },
      include: { stages: { orderBy: { order: 'asc' } } }
    });

    if (!session) {
      throw new NotFoundException('Recovery session not found');
    }

    return this.prisma.recoveryLog.create({
      data: {
        userId,
        sessionId: dto.sessionId,
        beforeMood: dto.beforeMood,
        beforeStress: dto.beforeStress,
      },
      include: { session: { include: { stages: { orderBy: { order: 'asc' } } } } }
    });
  }

  async completeSession(userId: string, dto: CompleteRecoveryDto) {
    const log = await this.prisma.recoveryLog.findUnique({
      where: { id: dto.logId },
    });

    if (!log || log.userId !== userId) {
      throw new NotFoundException('Recovery log not found');
    }

    const updatedLog = await this.prisma.recoveryLog.update({
      where: { id: dto.logId },
      data: {
        afterMood: dto.afterMood,
        afterStress: dto.afterStress,
        durationSeconds: dto.durationSeconds,
      },
    });

    // Update Effectiveness metrics
    const moodImprove = (dto.afterMood || 0) - (log.beforeMood || 0);
    const stressReduce = (log.beforeStress || 0) - (dto.afterStress || 0);

    await this.prisma.recoveryEffectiveness.upsert({
      where: { userId_sessionId: { userId, sessionId: log.sessionId } },
      create: {
        userId,
        sessionId: log.sessionId,
        avgMoodImprove: moodImprove,
        avgStressReduce: stressReduce,
        totalCompletions: 1,
      },
      update: {
        avgMoodImprove: { set: moodImprove }, // Simple moving average or update logic
        avgStressReduce: { set: stressReduce },
        totalCompletions: { increment: 1 },
      },
    });

    // Update Recovery Score
    await this.updateRecoveryScore(userId, dto);

    return updatedLog;
  }

  private async updateRecoveryScore(userId: string, dto: CompleteRecoveryDto) {
    const score = await this.prisma.recoveryScore.findUnique({
      where: { userId },
    });

    const now = new Date();
    let streakCount = score?.streakCount || 0;

    if (score?.lastRecoveredAt) {
      const lastDate = new Date(score.lastRecoveredAt);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streakCount += 1;
      } else if (diffDays > 1) {
        streakCount = 1;
      }
    } else {
      streakCount = 1;
    }

    // Heuristic for score update
    const recoveryGain = 15; 
    const newRecoveryLevel = Math.min(100, (score?.recoveryLevel || 50) + recoveryGain);
    const newStressLevel = Math.max(0, (score?.stressLevel || 50) - recoveryGain);

    return this.prisma.recoveryScore.upsert({
      where: { userId },
      create: {
        userId,
        recoveryLevel: newRecoveryLevel,
        stressLevel: newStressLevel,
        streakCount,
        lastRecoveredAt: now,
      },
      update: {
        recoveryLevel: newRecoveryLevel,
        stressLevel: newStressLevel,
        streakCount,
        lastRecoveredAt: now,
      },
    });
  }

  async getScore(userId: string) {
    let score = await this.prisma.recoveryScore.findUnique({
      where: { userId },
    });

    if (!score) {
      score = await this.prisma.recoveryScore.create({
        data: { userId },
      });
    }

    return score;
  }

  async getRecommendation(userId: string, category?: string) {
    let finalCategory = category;

    if (!finalCategory) {
      const lastMood = await this.prisma.moodLog.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastMood?.stress && lastMood.stress > 7) {
        finalCategory = 'Stress Relief';
      } else if (lastMood?.energy && lastMood.energy < 4) {
        finalCategory = 'Low Energy';
      } else {
        // Try to recommend based on what worked best for the user historically
        const bestEffectiveness = await this.prisma.recoveryEffectiveness.findFirst({
          where: { userId },
          orderBy: { avgMoodImprove: 'desc' },
          include: { session: true }
        });

        if (bestEffectiveness?.session) {
          return {
            reason: 'This session has been highly effective for you before',
            recommendedSession: bestEffectiveness.session,
          };
        }
        
        finalCategory = 'Mental Fatigue';
      }
    }

    const session = await this.prisma.recoverySession.findFirst({
      where: { category: finalCategory },
      include: { stages: { orderBy: { order: 'asc' } } }
    });

    return {
      reason: category 
        ? `Personalized for: ${category}`
        : finalCategory === 'Stress Relief' 
          ? 'Your stress level is elevated' 
          : 'Ready for your mental reset',
      recommendedSession: session,
    };
  }

  async getInsights(userId: string) {
    const preferences = await this.prisma.recoveryPreference.findMany({
      where: { userId },
      orderBy: { voteCount: 'desc' },
      take: 5,
    });

    const effectiveness = await this.prisma.recoveryEffectiveness.findMany({
      where: { userId },
      orderBy: { avgMoodImprove: 'desc' },
      include: { session: true },
      take: 5,
    });

    return {
      topPreferences: preferences,
      mostEffective: effectiveness,
    };
  }

  async recordFeedback(userId: string, stageType: string, isPositive: boolean) {
    return this.prisma.recoveryPreference.upsert({
      where: { userId_stageType: { userId, stageType } },
      create: {
        userId,
        stageType,
        voteCount: isPositive ? 1 : -1,
      },
      update: {
        voteCount: { increment: isPositive ? 1 : -1 },
        lastUsedAt: new Date(),
      },
    });
  }

  async getHistory(userId: string) {
    return this.prisma.recoveryLog.findMany({
      where: { userId },
      include: { session: { include: { stages: { orderBy: { order: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
