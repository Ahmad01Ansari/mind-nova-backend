import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateGroundingSessionDto,
  SubmitCalmRatingDto,
  FavoriteEnvironmentDto,
  GroundingHistoryQueryDto,
  GroundingExerciseType,
} from './dto/grounding.dto';

@Injectable()
export class GroundingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const [streak, analytics, recentSessions] = await Promise.all([
      this.prisma.groundingStreak.findUnique({ where: { userId } }),
      this.prisma.groundingAnalytics.findUnique({ where: { userId } }),
      this.prisma.groundingSession.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 3,
      }),
    ]);

    return {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalSessions: streak?.totalSessions ?? 0,
      totalMinutes: streak?.totalMinutes ?? 0,
      badges: streak?.badges ?? [],
      mostUsedExercise: analytics?.mostUsedExercise ?? null,
      mostEffectiveExercise: analytics?.mostEffectiveExercise ?? null,
      averageCalmRating: analytics?.averageCalmRating ?? 0,
      favoriteEnvironment: analytics?.favoriteEnvironment ?? null,
      recentSessions,
    };
  }

  async logSession(userId: string, dto: CreateGroundingSessionDto) {
    const session = await this.prisma.groundingSession.create({
      data: {
        userId,
        exerciseType: dto.exerciseType,
        environment: dto.environment,
        durationSecs: dto.durationSecs,
        calmBefore: dto.calmBefore,
        calmAfter: dto.calmAfter,
        wouldRepeat: dto.wouldRepeat,
        completedFull: dto.completedFull ?? true,
      },
    });

    // Update streak and analytics asynchronously
    this.updateStreakAndAnalytics(userId, dto).catch(() => {});

    return session;
  }

  async submitCalmRating(userId: string, sessionId: string, dto: SubmitCalmRatingDto) {
    const session = await this.prisma.groundingSession.update({
      where: { id: sessionId },
      data: {
        calmBefore: dto.calmBefore,
        calmAfter: dto.calmAfter,
        wouldRepeat: dto.wouldRepeat,
      },
    });

    // Recalculate analytics
    this.recomputeAnalytics(userId).catch(() => {});

    return session;
  }

  async getHistory(userId: string, query: GroundingHistoryQueryDto) {
    return this.prisma.groundingSession.findMany({
      where: {
        userId,
        ...(query.type ? { exerciseType: query.type } : {}),
      },
      orderBy: { completedAt: 'desc' },
      skip: Number(query.skip ?? 0),
      take: Number(query.take ?? 20),
    });
  }

  async getAnalytics(userId: string) {
    const analytics = await this.prisma.groundingAnalytics.findUnique({ where: { userId } });

    const weeklySessions = await this.prisma.groundingSession.count({
      where: {
        userId,
        completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const sessionsByType = await this.prisma.groundingSession.groupBy({
      by: ['exerciseType'],
      where: { userId },
      _count: { exerciseType: true },
      orderBy: { _count: { exerciseType: 'desc' } },
    });

    return {
      ...analytics,
      weeklySessions,
      sessionsByType,
      insights: this.generateInsights(analytics, weeklySessions, sessionsByType),
    };
  }

  async getFavorites(userId: string) {
    return this.prisma.groundingFavoriteEnvironment.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
    });
  }

  async saveFavoriteEnvironment(userId: string, dto: FavoriteEnvironmentDto) {
    const existing = await this.prisma.groundingFavoriteEnvironment.findFirst({
      where: { userId, environment: dto.environment },
    });

    if (existing) return existing;

    return this.prisma.groundingFavoriteEnvironment.create({
      data: { userId, environment: dto.environment },
    });
  }

  // ─── Private helpers ────────────────────────────────────────────

  private async updateStreakAndAnalytics(userId: string, dto: CreateGroundingSessionDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await this.prisma.groundingStreak.findUnique({ where: { userId } });
    const lastDate = streak?.lastSessionDate ? new Date(streak.lastSessionDate) : null;

    let newStreak = 1;
    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) newStreak = streak!.currentStreak;         // Same day
      else if (diffDays === 1) newStreak = streak!.currentStreak + 1; // Consecutive
      else newStreak = 1;                                             // Broken streak
    }

    const newTotal = (streak?.totalSessions ?? 0) + 1;
    const newMinutes = (streak?.totalMinutes ?? 0) + Math.round(dto.durationSecs / 60);
    const newLongest = Math.max(newStreak, streak?.longestStreak ?? 0);

    // Badge logic
    const badges = [...(streak?.badges ?? [])];
    if (!badges.includes('first_calm')) badges.push('first_calm');
    if (dto.exerciseType === GroundingExerciseType.PANIC_RESET && !badges.includes('panic_reset_hero')) {
      badges.push('panic_reset_hero');
    }
    if (newStreak >= 7 && !badges.includes('7_days_calm')) badges.push('7_days_calm');

    await this.prisma.groundingStreak.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalSessions: newTotal,
        totalMinutes: newMinutes,
        badges,
        lastSessionDate: new Date(),
      },
      update: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalSessions: newTotal,
        totalMinutes: newMinutes,
        badges,
        lastSessionDate: new Date(),
      },
    });

    await this.recomputeAnalytics(userId);
  }

  private async recomputeAnalytics(userId: string) {
    const sessions = await this.prisma.groundingSession.findMany({ where: { userId } });

    if (sessions.length === 0) return;

    // Most used exercise
    const countByType: Record<string, number> = {};
    sessions.forEach(s => { countByType[s.exerciseType] = (countByType[s.exerciseType] || 0) + 1; });
    const mostUsed = Object.entries(countByType).sort((a, b) => b[1] - a[1])[0]?.[0] as GroundingExerciseType;

    // Most effective (highest delta between calmAfter and calmBefore)
    const effectByType: Record<string, number[]> = {};
    sessions.forEach(s => {
      if (s.calmAfter && s.calmBefore) {
        const delta = s.calmAfter - s.calmBefore;
        if (!effectByType[s.exerciseType]) effectByType[s.exerciseType] = [];
        effectByType[s.exerciseType].push(delta);
      }
    });
    const avgEffectByType = Object.entries(effectByType).map(([type, deltas]) => ({
      type,
      avg: deltas.reduce((a, b) => a + b, 0) / deltas.length,
    }));
    const mostEffective = avgEffectByType.sort((a, b) => b.avg - a.avg)[0]?.type as GroundingExerciseType;

    // Average calm rating
    const ratedSessions = sessions.filter(s => s.calmAfter !== null);
    const avgRating = ratedSessions.length > 0
      ? ratedSessions.reduce((acc, s) => acc + (s.calmAfter ?? 0), 0) / ratedSessions.length
      : 0;

    const totalMinutes = sessions.reduce((acc, s) => acc + Math.round(s.durationSecs / 60), 0);

    await this.prisma.groundingAnalytics.upsert({
      where: { userId },
      create: { userId, mostUsedExercise: mostUsed, mostEffectiveExercise: mostEffective, averageCalmRating: avgRating, totalMinutes, weeklySessions: 1 },
      update: { mostUsedExercise: mostUsed, mostEffectiveExercise: mostEffective, averageCalmRating: avgRating, totalMinutes },
    });
  }

  private generateInsights(analytics: any, weeklySessions: number, sessionsByType: any[]): string[] {
    const insights: string[] = [];
    if (!analytics) return ['Start your first grounding session to unlock insights.'];

    if (analytics.mostUsedExercise) {
      const readable = analytics.mostUsedExercise.replace(/_/g, ' ').toLowerCase();
      insights.push(`You rely on ${readable} most — it's your go-to tool.`);
    }
    if (analytics.mostEffectiveExercise) {
      const readable = analytics.mostEffectiveExercise.replace(/_/g, ' ').toLowerCase();
      insights.push(`${readable} gives you the biggest calm boost.`);
    }
    if (analytics.favoriteEnvironment) {
      const env = analytics.favoriteEnvironment.replace(/_/g, ' ').toLowerCase();
      insights.push(`Your safe place is the ${env}.`);
    }
    if (weeklySessions >= 5) {
      insights.push("You've been very consistent this week. Keep it up! 🌿");
    }
    return insights;
  }
}
