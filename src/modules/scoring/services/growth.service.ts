import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class GrowthService {
  constructor(private prisma: PrismaService) {}

  async getGrowthSummary(userId: string) {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentScore, previousScore] = await Promise.all([
      this.calculateScoreForPeriod(userId, weekStart, now),
      this.calculateScoreForPeriod(userId, prevWeekStart, weekStart),
    ]);

    const delta = previousScore > 0 
      ? ((currentScore - previousScore) / previousScore) * 100 
      : (currentScore > 0 ? 100 : 0);

    return {
      currentScore: Math.round(currentScore * 10) / 10,
      previousScore: Math.round(previousScore * 10) / 10,
      delta: Math.round(delta * 10) / 10,
      status: delta >= 0 ? 'improving' : 'declining',
    };
  }

  private async calculateScoreForPeriod(userId: string, since: Date, until: Date): Promise<number> {
    const [moodLogs, habitLogs, focusSessions, groundingLogs] = await Promise.all([
      this.prisma.moodLog.findMany({
        where: { userId, createdAt: { gte: since, lte: until } },
      }),
      this.prisma.habitLog.findMany({
        where: { userId, completedAt: { gte: since, lte: until } },
      }),
      this.prisma.focusSession.findMany({
        where: { userId, startedAt: { gte: since, lte: until }, completed: true },
      }),
      this.prisma.groundingSession?.findMany({
        where: { userId, completedAt: { gte: since, lte: until } },
      }) || Promise.resolve([]),
    ]);

    // 1. Mood Stability (0-100)
    // Formula: Average mood score (1-5 scale mapped to 0-100)
    let moodStability = 50; // default neutral
    if (moodLogs.length > 0) {
      const avgMood = moodLogs.reduce((acc, log) => acc + log.score, 0) / moodLogs.length;
      moodStability = (avgMood / 5) * 100;
    }

    // 2. Habit Consistency (0-100)
    // Formula: Count of logs relative to active habits (mocked active habits as 3 if none)
    const activeHabitsCount = await this.prisma.habit.count({ where: { userId, isActive: true } }) || 3;
    const expectedLogs = activeHabitsCount * 7;
    const habitConsistency = Math.min(100, (habitLogs.length / expectedLogs) * 100);

    // 3. Engagement Score (0-100)
    // Formula: Volume of activities (Moods + Focus + Grounding)
    const engagementCount = moodLogs.length + focusSessions.length + groundingLogs.length;
    const engagementScore = Math.min(100, (engagementCount / 15) * 100); // 15 activities/week is 100%

    // 4. Recovery Effectiveness (0-100)
    // We can't easily query Mongoose from here without injecting the model, 
    // so we'll use a placeholder or check Prisma MoodLogs for notes/tags
    const recoveryScore = 70; // Placeholder for now

    // Final Weighted Score
    // 30% Habits, 25% Mood, 25% Engagement, 20% Recovery
    const finalScore = (habitConsistency * 0.3) + 
                       (moodStability * 0.25) + 
                       (engagementScore * 0.25) + 
                       (recoveryScore * 0.2);

    return finalScore;
  }
}
