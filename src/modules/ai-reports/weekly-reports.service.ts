import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class WeeklyReportsService {
  private readonly logger = new Logger(WeeklyReportsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main entry: generate a weekly report for a single user.
   * Contains 3-attempt retry for AI, local fallback, and duplicate protection.
   */
  async generateForUser(userId: string): Promise<any> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = now;

    // (Removed duplicate guard to allow re-generation on refresh via upsert)

    // ══════════════════════════════════════════════════════════════════════
    //  PHASE 1: AGGREGATE DATA FROM 10 PRISMA TABLES
    // ══════════════════════════════════════════════════════════════════════

    // 1. Mood Logs
    const moodLogs = await this.prisma.moodLog.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: now }, deletedAt: null },
      include: { tags: true },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Gratitude Entries
    const gratitudeEntries = await this.prisma.gratitudeEntry.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: now } },
    });

    // 3. Journal Entries
    const journalEntries = await this.prisma.journalEntry.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: now }, isDraft: false },
    });

    // 4. Meditation Sessions
    const meditationSessions = await this.prisma.meditationSession.findMany({
      where: { userId, completedAt: { gte: weekStart, lte: now } },
    });

    // 5. Grounding Sessions
    const groundingSessions = await this.prisma.groundingSession.findMany({
      where: { userId, completedAt: { gte: weekStart, lte: now } },
    });

    // 6. Audio Usage
    const audioUsage = await this.prisma.userAudioHistory.findMany({
      where: { userId, playedAt: { gte: weekStart, lte: now } },
      include: { track: { select: { durationSeconds: true } } },
    });

    // 7. Latest CMHI Score
    const latestCMHI = await this.prisma.multiDimensionalScore.findFirst({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
    });

    // 8. Streaks
    const moodStreak = await this.prisma.moodStreak.findUnique({ where: { userId } });
    const gratitudeStreak = await this.prisma.gratitudeStreak.findUnique({ where: { userId } });
    const journalStreak = await this.prisma.journalStreak.findUnique({ where: { userId } });

    // 9. Habit Logs
    const habitLogs = await this.prisma.habitLog.findMany({
      where: { userId, completedAt: { gte: weekStart, lte: now } },
      include: { habit: { select: { title: true } } },
    });

    // 10. Previous Week Report (for comparison)
    const previousReport = await this.prisma.weeklyReport.findFirst({
      where: { userId, weekEndDate: { lt: weekStart } },
      orderBy: { createdAt: 'desc' },
    });

    // ══════════════════════════════════════════════════════════════════════
    //  PHASE 2: CALCULATE ALL METRICS
    // ══════════════════════════════════════════════════════════════════════

    const moodLogCount = moodLogs.length;
    const scores = moodLogs.map(l => l.score);

    // ── Mood Metrics ──
    const avgMoodScore = moodLogCount > 0 ? scores.reduce((a, b) => a + b, 0) / moodLogCount : 0;

    // Best/Worst day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let bestMoodDay: string | null = null;
    let worstMoodDay: string | null = null;
    if (moodLogCount > 0) {
      const bestLog = moodLogs.reduce((best, log) => log.score > best.score ? log : best, moodLogs[0]);
      const worstLog = moodLogs.reduce((worst, log) => log.score < worst.score ? log : worst, moodLogs[0]);
      bestMoodDay = dayNames[bestLog.createdAt.getDay()];
      worstMoodDay = dayNames[worstLog.createdAt.getDay()];
    }

    // Mood Trend (linear regression slope sign)
    let moodTrend = 'FLAT';
    if (moodLogCount >= 3) {
      const n = moodLogCount;
      const sumX = scores.reduce((_, __, i) => _ + i, 0);
      const sumY = scores.reduce((a, b) => a + b, 0);
      const sumXY = scores.reduce((acc, y, i) => acc + i * y, 0);
      const sumX2 = scores.reduce((acc, _, i) => acc + i * i, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      if (slope > 0.15) moodTrend = 'UP';
      else if (slope < -0.15) moodTrend = 'DOWN';
    }

    // Emotional Volatility (standard deviation)
    let emotionalVolatility: number | null = null;
    if (moodLogCount >= 2) {
      const variance = scores.reduce((acc, s) => acc + Math.pow(s - avgMoodScore, 2), 0) / moodLogCount;
      emotionalVolatility = Math.sqrt(variance);
    }

    // ── Sleep Metrics ──
    const sleepLogs = moodLogs.filter(l => l.sleepHours != null).map(l => l.sleepHours!);
    const avgSleepHours = sleepLogs.length > 0 ? sleepLogs.reduce((a, b) => a + b, 0) / sleepLogs.length : null;
    let sleepConsistency: number | null = null;
    if (sleepLogs.length >= 2 && avgSleepHours != null) {
      const sleepVariance = sleepLogs.reduce((acc, s) => acc + Math.pow(s - avgSleepHours, 2), 0) / sleepLogs.length;
      sleepConsistency = Math.max(0, Math.min(1, 1.0 - Math.sqrt(sleepVariance) / 4.0));
    }

    // ── Engagement Metrics ──
    const gratitudeCount = gratitudeEntries.length;
    const journalCount = journalEntries.length;
    const meditationMinutes = Math.round(meditationSessions.reduce((acc, s) => acc + s.durationSecs, 0) / 60);
    const groundingCount = groundingSessions.length;
    const audioMinutes = Math.round(audioUsage.reduce((acc, a) => acc + (a.track?.durationSeconds ?? 0), 0) / 60);
    
    const habitCompletions = habitLogs.length;
    const habitBreakdown = habitLogs.reduce((acc, log) => {
      acc[log.habit.title] = (acc[log.habit.title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // ── Stress / Burnout (Enhanced Formula) ──
    const stressLogs = moodLogs.filter(l => l.stress != null).map(l => l.stress!);
    const stressAvg = stressLogs.length > 0 ? stressLogs.reduce((a, b) => a + b, 0) / stressLogs.length : null;

    let burnoutRisk: number | null = null;
    if (avgMoodScore != null) {
      const negativeStreak = moodLogs.filter(l => l.score <= 2).length;
      const stressVal = stressAvg ?? 5;
      
      // Components
      const stressComponent = (stressVal / 10) * 0.5;
      
      // Default to 7 hours if no sleep logged, to avoid nullifying the whole risk metric
      const sleepVal = avgSleepHours ?? 7; 
      const sleepComponent = Math.max(0, (8 - sleepVal) / 8) * 0.3;
      
      const streakComponent = Math.min(0.15, (negativeStreak / 7) * 0.15);
      
      // Inactivity penalty if no wellness tools were used during high stress
      const toolUsed = meditationMinutes > 0 || gratitudeCount > 0 || journalCount > 0 || groundingCount > 0;
      const inactivityPenalty = (!toolUsed && stressVal > 7) ? 0.05 : 0;

      burnoutRisk = Math.min(1, stressComponent + sleepComponent + streakComponent + inactivityPenalty);
    }

    // ── Composite Scores ──
    const streakScore = (moodStreak?.currentStreak ?? 0) + (gratitudeStreak?.currentStreak ?? 0) + (journalStreak?.currentStreak ?? 0);
    const cmhiWeeklyScore = latestCMHI?.cmhi ?? null;

    // Engagement Score (0–100)
    const engagementScore = Math.min(100,
      (moodLogCount * 5) + (gratitudeCount * 8) + (journalCount * 10) +
      (meditationMinutes * 3) + (groundingCount * 5) + (audioMinutes * 2) +
      (habitCompletions * 5)
    );

    // Recovery Score (0–100): weighted composite
    const sleepNorm = avgSleepHours != null ? Math.min(1, avgSleepHours / 9) : 0;
    const meditationNorm = Math.min(1, meditationMinutes / 60);
    const moodImprovementNorm = moodTrend === 'UP' ? 1 : moodTrend === 'FLAT' ? 0.5 : 0.2;
    const gratitudeNorm = Math.min(1, gratitudeCount / 5);
    const recoveryScore = Math.round((sleepNorm * 0.3 + meditationNorm * 0.25 + moodImprovementNorm * 0.25 + gratitudeNorm * 0.2) * 100);

    // Wellness Score (0–100): master composite
    const moodNorm = moodLogCount > 0 ? Math.min(1, avgMoodScore / 5) : 0;
    const stressNorm = stressAvg != null ? stressAvg / 10 : 0.5;
    const engagementNorm = engagementScore / 100;
    const wellnessScore = Math.round(
      (moodNorm * 0.3 + sleepNorm * 0.2 + (recoveryScore / 100) * 0.2 + engagementNorm * 0.15 + (1 - stressNorm) * 0.15) * 100
    );

    // ── Data Confidence ──
    const sourceDiversity = [
      moodLogCount > 0, gratitudeCount > 0, journalCount > 0,
      meditationMinutes > 0, groundingCount > 0, audioMinutes > 0,
    ].filter(Boolean).length;
    const dataCompleteness = Math.min(100, Math.round(
      (Math.min(moodLogCount, 7) / 7 * 50) + (sourceDiversity / 6 * 30) + (sleepLogs.length > 0 ? 20 : 0)
    ));
    let dataConfidence = 'LOW';
    if (moodLogCount >= 5 && sleepLogs.length >= 4) dataConfidence = 'HIGH';
    else if (moodLogCount >= 3) dataConfidence = 'MEDIUM';

    // ── Previous Week Comparison ──
    const previousWellnessScore = previousReport?.wellnessScore ?? null;
    const previousMoodScore = previousReport?.avgMoodScore ?? null;
    const weekDelta = previousWellnessScore != null ? wellnessScore - previousWellnessScore : null;
    const improved = weekDelta != null ? weekDelta > 0 : null;

    // ── Enriched AI Context ──
    const topTags = this.getTopTags(moodLogs);
    const bestTool = this.getBestTool(meditationMinutes, groundingCount, audioMinutes, journalCount, gratitudeCount);
    const skippedDays = 7 - moodLogCount;
    const longestPositiveStreak = this.getLongestPositiveStreak(moodLogs);

    // ══════════════════════════════════════════════════════════════════════
    //  PHASE 3: AI SUMMARY (with retry + fallback)
    // ══════════════════════════════════════════════════════════════════════

    const metricsPayload = {
      avgMoodScore, moodTrend, bestMoodDay, worstMoodDay, moodLogCount,
      avgSleepHours, sleepConsistency,
      stressAvg, burnoutRisk, emotionalVolatility,
      gratitudeCount, journalCount, meditationMinutes, groundingSessions: groundingCount, audioMinutes,
      habitCompletions, habitBreakdown,
      recoveryScore, wellnessScore, engagementScore, cmhiWeeklyScore, streakScore,
      topTags, bestTool, skippedDays, longestPositiveStreak,
      previousWellnessScore, previousMoodScore, weekDelta, improved,
      dataConfidence,
    };

    let aiResult = await this.callAiSummary(userId, metricsPayload);

    // ══════════════════════════════════════════════════════════════════════
    //  PHASE 4: SAVE IMMUTABLE SNAPSHOT TO DB
    // ══════════════════════════════════════════════════════════════════════

    const lastSleepLogAt = moodLogs
      .filter(l => l.sleepHours != null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt ?? null;

    const reportData = {
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      avgMoodScore,
      bestMoodDay,
      worstMoodDay,
      moodTrend,
      moodLogCount,
      avgSleepHours,
      sleepConsistency,
      stressAvg,
      burnoutRisk,
      anxietyTrend: latestCMHI?.anxietyRisk ?? null,
      depressionTrend: latestCMHI?.depressionRisk ?? null,
      gratitudeCount,
      journalCount,
      meditationMinutes,
      groundingSessions: groundingCount,
      lastSleepLogAt,
      audioMinutes,
      emotionalVolatility,
      recoveryScore,
      wellnessScore,
      engagementScore,
      cmhiWeeklyScore,
      streakScore,
      aiSummary: aiResult.summary,
      aiTitle: aiResult.title,
      aiWhatHelped: aiResult.whatHelped,
      aiChallenges: aiResult.challenges,
      aiComparison: aiResult.comparison,
      aiRecommendations: aiResult.recommendations,
      aiEncouragement: aiResult.encouragement,
      previousWellnessScore,
      previousMoodScore,
      weekDelta,
      improved,
      crisisRiskLevel: burnoutRisk != null && burnoutRisk > 0.7 ? 'HIGH' : stressAvg != null && stressAvg > 7 ? 'MED' : 'LOW',
      dataCompleteness,
      dataConfidence,
      reportVersion: '2.0',
    };

    const report = await this.prisma.weeklyReport.upsert({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: weekStart,
        },
      },
      update: reportData,
      create: reportData,
    });

    this.logger.log(`✅ Weekly report generated for user ${userId}: ${report.id}`);
    return { status: 'success', reportId: report.id };
  }

  // ══════════════════════════════════════════════════════════════════════
  //  AI SUMMARY WITH 3-ATTEMPT RETRY + LOCAL FALLBACK
  // ══════════════════════════════════════════════════════════════════════

  private async callAiSummary(userId: string, metrics: any): Promise<any> {
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    const bridgeSecret = process.env.FASTAPI_BRIDGE_SECRET;

    if (!aiServiceUrl) {
      this.logger.error('AI_SERVICE_URL is not defined in environment');
      return this.buildLocalFallback(metrics);
    }

    const delays = [5000, 10000, 20000]; // 5s, 10s, 20s exponential backoff

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.logger.log(`AI Summary attempt ${attempt + 1}/3...`);
        const response = await axios.post(
          `${aiServiceUrl}/reports/weekly/summarize`,
          { userId, metrics },
          {
            headers: { 'x-bridge-secret': bridgeSecret, 'Content-Type': 'application/json' },
            timeout: 60000,
          },
        );
        return response.data;
      } catch (error: any) {
        this.logger.warn(`AI attempt ${attempt + 1} failed: ${error.message}`);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
      }
    }

    // All 3 attempts failed → use local rule-based fallback
    this.logger.warn(`All AI attempts failed. Using local fallback for user ${userId}`);
    return this.buildLocalFallback(metrics);
  }

  private buildLocalFallback(m: any): any {
    const moodLabel = m.avgMoodScore >= 4 ? 'positive' : m.avgMoodScore >= 2.5 ? 'mixed' : 'challenging';
    const trendLabel = m.moodTrend === 'UP' ? 'improving' : m.moodTrend === 'DOWN' ? 'declining' : 'steady';

    const title = m.moodTrend === 'UP'
      ? 'A Week of Growth ✨'
      : m.moodTrend === 'DOWN'
        ? 'A Challenging Week — You\'re Still Here 💪'
        : 'Steady Progress This Week';

    const summary = `This week showed ${moodLabel} emotional patterns with a ${trendLabel} trend. `
      + `You logged ${m.moodLogCount} mood check-in${m.moodLogCount !== 1 ? 's' : ''}`
      + (m.avgSleepHours ? ` and averaged ${m.avgSleepHours.toFixed(1)} hours of sleep` : '')
      + '.';

    const whatHelped = m.bestTool
      ? `Your most used wellness tool was ${m.bestTool}, which likely contributed to your recovery.`
      : 'Consistent check-ins helped maintain awareness of your emotional state.';

    const challenges = m.stressAvg != null && m.stressAvg > 6
      ? 'Elevated stress levels were detected throughout the week. Consider lighter workloads.'
      : m.skippedDays > 4
        ? 'Several days without check-ins made it harder to track your patterns.'
        : 'No major challenges were flagged this week.';

    let comparison: string | null = null;
    if (m.weekDelta != null) {
      comparison = m.weekDelta > 0
        ? `Your wellness score improved by ${Math.abs(m.weekDelta).toFixed(0)} points compared to last week.`
        : m.weekDelta < 0
          ? `Your wellness score dipped by ${Math.abs(m.weekDelta).toFixed(0)} points. Focus on recovery this week.`
          : 'Your wellness score held steady from last week.';
    }

    const recommendations = [
      m.moodLogCount < 5 ? 'Try logging your mood daily for better insights.' : 'Keep up the daily mood check-ins.',
      m.meditationMinutes < 10 ? 'Try a 5-minute meditation session this week.' : 'Great meditation consistency — keep it going.',
      m.gratitudeCount < 3 ? 'Write 3 gratitude entries this week for a mood boost.' : 'Your gratitude practice is strong.',
    ];

    return {
      title,
      summary,
      whatHelped,
      challenges,
      comparison,
      recommendations,
      encouragement: 'Every check-in is a step forward. You\'re building real self-awareness. 🌟',
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  //  HELPER METHODS
  // ══════════════════════════════════════════════════════════════════════

  private getTopTags(logs: any[]): string[] {
    const tagCounts: Record<string, number> = {};
    logs.forEach(log => {
      log.tags?.forEach((tag: any) => {
        tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  private getBestTool(
    meditationMins: number, groundingCount: number, audioMins: number,
    journalCount: number, gratitudeCount: number,
  ): string | null {
    const tools: [string, number][] = [
      ['Meditation', meditationMins],
      ['Grounding', groundingCount * 5],
      ['Audio Therapy', audioMins],
      ['Journaling', journalCount * 10],
      ['Gratitude', gratitudeCount * 8],
    ];
    const best = tools.reduce((a, b) => b[1] > a[1] ? b : a, ['None', 0]);
    return best[1] > 0 ? best[0] : null;
  }

  private getLongestPositiveStreak(logs: any[]): number {
    let max = 0, current = 0;
    logs.forEach(log => {
      if (log.score >= 4) { current++; max = Math.max(max, current); }
      else { current = 0; }
    });
    return max;
  }
}
