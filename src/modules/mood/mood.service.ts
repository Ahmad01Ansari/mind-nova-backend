import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MoodLogDocument, MoodLog } from './schemas/mood-log.schema';
import { MoodMemoryDocument, MoodMemory } from './schemas/mood-memory.schema';
import { MoodCrisisEventDocument, MoodCrisisEvent } from './schemas/mood-crisis.schema';
import { MoodSuggestionDocument, MoodSuggestion, SuggestionType } from './schemas/mood-suggestion.schema';
import { MoodRecoveryLogDocument, MoodRecoveryLog } from './schemas/mood-recovery.schema';
import { CrisisService } from '../crisis/crisis.service';
import { MOOD_REGISTRY, MOOD_QUESTION_BANK } from './mood.registry';

// ─── Mood Scoring & Color Map ─────────────────────────────────────────────────

const MOOD_SCORE_MAP: Record<string, Record<string, number>> = {
  positive: { extreme: 5.0, strong: 4.5, moderate: 4.0, mild: 3.5 },
  neutral:  { extreme: 3.0, strong: 3.0, moderate: 3.0, mild: 3.0 },
  negative: { mild: 2.5, moderate: 2.0, strong: 1.5, extreme: 1.0 },
  critical: { extreme: 0.5, strong: 0.5, moderate: 0.5, mild: 0.5 },
};

const MOOD_COLOR_MAP: Record<string, string> = {
  positive: '#10B981',
  neutral:  '#9CA3AF',
  negative: '#8B5CF6',
  critical: '#EF4444',
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  positive: '#10B981',
  neutral:  '#9CA3AF',
  negative: '#8B5CF6',
  critical: '#EF4444',
};

type MoodEntry = { category: string; intensity: string; moodName: string; tags: string[]; createdAt: Date; aiSafetyFlag?: boolean };

function scoreMood(entry: MoodEntry): number {
  const cat = (entry.category || 'neutral').toLowerCase();
  const int = (entry.intensity || 'moderate').toLowerCase();
  return MOOD_SCORE_MAP[cat]?.[int] ?? 3.0;
}

function moodColor(category: string): string {
  return CATEGORY_COLOR_MAP[(category || 'neutral').toLowerCase()] ?? '#9CA3AF';
}

function moodEmoji(moodName: string): string {
  const key = (moodName || 'NEUTRAL').toUpperCase().replace(/\s+/g, '_');
  return MOOD_REGISTRY[key]?.emoji ?? '😐';
}

function insightMessage(logs: MoodEntry[]): string {
  if (!logs.length) return 'Start logging to discover your emotional patterns.';
  const scores = logs.map(scoreMood);
  const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
  const positiveCount = logs.filter(l => l.category === 'positive').length;
  const positivePct = Math.round((positiveCount / logs.length) * 100);

  if (avg >= 4.0) return `You've been in great emotional shape lately 🌟`;
  if (avg >= 3.5) return `Things are looking up for you this week 🌿`;
  if (avg >= 3.0) return `You're holding steady — keep checking in 💛`;
  if (avg >= 2.0) return `It's been a tough stretch. You're doing your best 💜`;
  return `Difficult times call for extra care. Nova is here for you 🤍`;
}

function generateWeeklyInsights(logs: MoodEntry[]): string[] {
  const insights: string[] = [];
  if (!logs.length) return ['Start logging moods to unlock personalized insights.'];

  // Pattern: Weekday vs Weekend
  const weekdayLogs = logs.filter(l => [1,2,3,4,5].includes(new Date(l.createdAt).getDay()));
  const weekendLogs = logs.filter(l => [0,6].includes(new Date(l.createdAt).getDay()));
  if (weekdayLogs.length && weekendLogs.length) {
    const weekdayAvg = weekdayLogs.map(scoreMood).reduce((a,b)=>a+b,0)/weekdayLogs.length;
    const weekendAvg = weekendLogs.map(scoreMood).reduce((a,b)=>a+b,0)/weekendLogs.length;
    if (weekendAvg > weekdayAvg + 0.5) {
      insights.push(`You were ${Math.round((weekendAvg - weekdayAvg) * 20)}% calmer on weekends — weekday stress may be a key factor.`);
    }
  }

  // Pattern: Top trigger
  const tagFreq: Record<string, number> = {};
  logs.forEach(l => l.tags?.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1; }));
  const topTag = Object.entries(tagFreq).sort((a,b) => b[1]-a[1])[0];
  if (topTag && topTag[1] >= 2) {
    insights.push(`"${topTag[0]}" appeared in ${topTag[1]} of your recent logs — it may be shaping your mood.`);
  }

  // Pattern: Mostly negative
  const negativeLogs = logs.filter(l => l.category === 'negative' || l.category === 'critical');
  if (negativeLogs.length > logs.length * 0.5) {
    insights.push(`More than half your recent check-ins were difficult. Consider a recovery session or talking to someone.`);
  }

  // Pattern: Crisis flag
  const crisisLogs = logs.filter(l => l.aiSafetyFlag);
  if (crisisLogs.length) {
    insights.push(`You had ${crisisLogs.length} high-stress check-in(s). Nova recommends extra self-compassion this week.`);
  }

  // Pattern: Improving
  if (logs.length >= 4) {
    const half = Math.floor(logs.length / 2);
    const recent = logs.slice(0, half).map(scoreMood).reduce((a,b)=>a+b,0)/half;
    const older  = logs.slice(half).map(scoreMood).reduce((a,b)=>a+b,0)/(logs.length-half);
    if (recent > older + 0.3) {
      insights.push(`Your mood has been trending upward recently — whatever you are doing, keep it up 🌱`);
    } else if (older > recent + 0.3) {
      insights.push(`Your mood dipped a little recently. Rest and small joys can help restore balance.`);
    }
  }

  if (!insights.length) {
    insights.push(`You are building a great emotional self-awareness habit by logging consistently.`);
  }

  return insights.slice(0, 5);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MoodService {
  private readonly logger = new Logger(MoodService.name);

  constructor(
    private prisma: PrismaService,
    private crisisService: CrisisService,
    @InjectModel(MoodLog.name)          private moodLogModel: Model<MoodLogDocument>,
    @InjectModel(MoodMemory.name)       private moodMemoryModel: Model<MoodMemoryDocument>,
    @InjectModel(MoodCrisisEvent.name)  private crisisEventModel: Model<MoodCrisisEventDocument>,
    @InjectModel(MoodSuggestion.name)   private suggestionModel: Model<MoodSuggestionDocument>,
    @InjectModel(MoodRecoveryLog.name)  private recoveryLogModel: Model<MoodRecoveryLogDocument>,
  ) {}

  async createLog(userId: string, dto: any) {
    let isCrisis = false;
    const notesLower = (dto.notes || '').toLowerCase();
    const crisisKeywords = ['hopeless', 'end it', 'can\'t take it', 'panic', 'die'];
    if (crisisKeywords.some(kw => notesLower.includes(kw))) isCrisis = true;

    // 1. Save to Mongoose (Legacy/AI Context)
    const log = await this.moodLogModel.create({
      userId, moodName: dto.moodName, category: dto.category,
      intensity: dto.intensity, tags: dto.tags || [], notes: dto.notes,
      followUpAnswers: dto.followUpAnswers || [], aiSafetyFlag: isCrisis,
    });

    // 2. Save to Prisma (Analytics Source of Truth)
    const scaledScore = scoreMood({
      category: dto.category,
      intensity: dto.intensity,
      moodName: dto.moodName,
      tags: dto.tags || [],
      createdAt: new Date(),
    });

    const extractedSleep = this.extractMetric([], ['sleep_hours'], notesLower);
    const extractedStress = this.extractMetric([], ['stress_level'], notesLower);

    await this.prisma.moodLog.create({
      data: {
        userId,
        score: Math.round(scaledScore),
        note: dto.notes,
        energy: dto.energy,
        stress: dto.stress ?? (extractedStress !== null ? Math.round(extractedStress) : undefined),
        sleepHours: dto.sleepHours ?? extractedSleep,
        tags: {
          create: (dto.tags || []).map((tag: string) => ({ name: tag })),
        },
      },
    });

    if (isCrisis) {
      await this.crisisEventModel.create({
        userId, moodLogId: log._id.toString(),
        triggerKeyword: 'NLP Pattern Match', riskLevel: 'high', actionTaken: false,
      });
    }

    await this.updateStreak(userId, new Date());
    return log;
  }

  async getHistory(userId: string) {
    return this.moodLogModel.find({ userId }).sort({ createdAt: -1 }).limit(20);
  }

  async getStreak(userId: string) {
    const streak = await this.prisma.moodStreak.findUnique({ where: { userId } });
    return {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastLogDate: streak?.lastLogDate,
    };
  }

  // ─── Fixed: returns computed {score, date, mood, category, color, emoji}[] ──
  async getTrend(userId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.moodLogModel
      .find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: 1 });

    return logs.map(log => ({
      score: scoreMood(log as unknown as MoodEntry),
      date: log['createdAt'],
      mood: log.moodName,
      category: log.category,
      color: moodColor(log.category),
      emoji: moodEmoji(log.moodName),
    }));
  }

  // ─── NEW: Home Widget ─────────────────────────────────────────────────────
  async getHomeWidget(userId: string) {
    const logs = await this.moodLogModel.find({ userId }).sort({ createdAt: -1 }).limit(30);
    const latest = logs[0];

    const streak = await this.prisma.moodStreak.findUnique({ where: { userId } }).catch(() => null);

    // 7-day sparkline
    const sparkline = await this.getTrend(userId, 7);
    const sparklineScores = sparkline.map(s => s.score);

    // Multi-streak
    const positiveLogs = logs.filter(l => l.category === 'positive');
    let positiveStreak = 0;
    for (const l of logs) {
      if (l.category === 'positive') positiveStreak++; else break;
    }

    if (!latest) {
      return {
        hasLogs: false,
        latestMood: null,
        insightMessage: 'Start your first emotional check-in ✨',
        sparkline: [],
        streaks: { dailyCheckin: 0, positiveMood: 0, calmDay: 0 },
      };
    }

    return {
      hasLogs: true,
      latestMood: latest.moodName,
      latestCategory: latest.category,
      latestEmoji: moodEmoji(latest.moodName),
      latestColor: moodColor(latest.category),
      loggedAt: latest['createdAt'],
      insightMessage: insightMessage(logs as unknown as MoodEntry[]),
      sparkline: sparklineScores,
      streaks: {
        dailyCheckin: streak?.currentStreak ?? 0,
        longest: streak?.longestStreak ?? 0,
        positiveMood: positiveStreak,
        calmDay: 0, // future: computed from sleep/calm category
      },
    };
  }

  // ─── NEW: Analytics Summary ───────────────────────────────────────────────
  async getAnalyticsSummary(userId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const prevSince = new Date();
    prevSince.setDate(prevSince.getDate() - days * 2);

    const [currentLogs, previousLogs] = await Promise.all([
      this.moodLogModel.find({ userId, createdAt: { $gte: since } }).sort({ createdAt: -1 }),
      this.moodLogModel.find({ userId, createdAt: { $gte: prevSince, $lt: since } }),
    ]);

    if (!currentLogs.length) {
      return { hasData: false, summaryMessage: 'No mood data for this period.' };
    }

    // Scores
    const currentScores = currentLogs.map(l => scoreMood(l as unknown as MoodEntry));
    const prevScores    = previousLogs.map(l => scoreMood(l as unknown as MoodEntry));
    const avgCurrent = currentScores.reduce((a,b)=>a+b,0) / currentScores.length;
    const avgPrev    = prevScores.length ? prevScores.reduce((a,b)=>a+b,0) / prevScores.length : avgCurrent;
    const deltaPercent = prevScores.length ? Math.round(((avgCurrent - avgPrev) / avgPrev) * 100) : 0;

    // Category distribution
    const total = currentLogs.length;
    const posCnt = currentLogs.filter(l=>l.category==='positive').length;
    const neuCnt = currentLogs.filter(l=>l.category==='neutral').length;
    const negCnt = currentLogs.filter(l=>l.category==='negative').length;
    const criCnt = currentLogs.filter(l=>l.category==='critical').length;

    // Dominant mood
    const moodFreq: Record<string, number> = {};
    currentLogs.forEach(l => { moodFreq[l.moodName] = (moodFreq[l.moodName] || 0) + 1; });
    const [dominantMood, domFreq] = Object.entries(moodFreq).sort((a,b)=>b[1]-a[1])[0] ?? ['Unknown', 0];
    const domKey = (dominantMood).toUpperCase().replace(/\s+/g, '_');
    const domReg = MOOD_REGISTRY[domKey] ?? MOOD_REGISTRY['NEUTRAL'];

    // Positive streak
    let positiveStreak = 0;
    for (const l of currentLogs) {
      if (l.category === 'positive') positiveStreak++; else break;
    }

    // Important moments
    const sortedByScore = [...currentLogs].sort((a,b) =>
      scoreMood(a as unknown as MoodEntry) - scoreMood(b as unknown as MoodEntry));
    const worstLog  = sortedByScore[0];
    const bestLog   = sortedByScore[sortedByScore.length - 1];

    const importantMoments = [
      worstLog ? {
        type: 'lowPoint', date: worstLog['createdAt'],
        mood: worstLog.moodName, emoji: moodEmoji(worstLog.moodName),
        color: moodColor(worstLog.category),
      } : null,
      bestLog && bestLog !== worstLog ? {
        type: 'bestDay', date: bestLog['createdAt'],
        mood: bestLog.moodName, emoji: moodEmoji(bestLog.moodName),
        color: moodColor(bestLog.category),
      } : null,
    ].filter(Boolean);

    return {
      hasData: true,
      dominantMood,
      dominantEmoji: domReg.emoji,
      dominantColor: moodColor(domReg.category),
      averageScore: Math.round(avgCurrent * 10) / 10,
      totalLogs: total,
      positivePercent: Math.round((posCnt / total) * 100),
      neutralPercent:  Math.round((neuCnt / total) * 100),
      negativePercent: Math.round((negCnt / total) * 100),
      criticalPercent: Math.round((criCnt / total) * 100),
      positiveStreak,
      weeklyDelta: (deltaPercent >= 0 ? '+' : '') + deltaPercent + '%',
      improvedVsLastPeriod: deltaPercent > 0,
      trendDirection: deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'stable',
      summaryMessage: insightMessage(currentLogs as unknown as MoodEntry[]),
      importantMoments,
    };
  }

  // ─── NEW: Mood Distribution ───────────────────────────────────────────────
  async getMoodDistribution(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const logs = await this.moodLogModel.find({ userId, createdAt: { $gte: since } });

    if (!logs.length) return { hasData: false, breakdown: [] };

    const total = logs.length;
    const catCounts: Record<string, number> = {};
    const moodDetails: Record<string, { count: number; category: string }> = {};

    logs.forEach(l => {
      catCounts[l.category] = (catCounts[l.category] || 0) + 1;
      if (!moodDetails[l.moodName]) moodDetails[l.moodName] = { count: 0, category: l.category };
      moodDetails[l.moodName].count++;
    });

    const breakdown = Object.entries(moodDetails)
      .sort((a,b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([mood, d]) => ({
        mood, count: d.count,
        percent: Math.round((d.count / total) * 100),
        color: moodColor(d.category),
        emoji: moodEmoji(mood),
        category: d.category,
      }));

    return {
      hasData: true,
      totalLogs: total,
      positive: Math.round(((catCounts['positive'] || 0) / total) * 100),
      neutral:  Math.round(((catCounts['neutral']  || 0) / total) * 100),
      negative: Math.round(((catCounts['negative'] || 0) / total) * 100),
      critical: Math.round(((catCounts['critical'] || 0) / total) * 100),
      breakdown,
    };
  }

  // ─── NEW: Trigger Analysis with Correlations ──────────────────────────────
  async getTriggerAnalysis(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const logs = await this.moodLogModel.find({ userId, createdAt: { $gte: since } });

    if (!logs.length) return { hasData: false, topTriggers: [], correlations: [] };

    // Tag frequency
    const tagData: Record<string, { count: number; linkedMoods: Record<string, number>; categories: string[] }> = {};

    logs.forEach(l => {
      (l.tags || []).forEach(tag => {
        if (!tagData[tag]) tagData[tag] = { count: 0, linkedMoods: {}, categories: [] };
        tagData[tag].count++;
        tagData[tag].linkedMoods[l.moodName] = (tagData[tag].linkedMoods[l.moodName] || 0) + 1;
        tagData[tag].categories.push(l.category);
      });
    });

    const topTriggers = Object.entries(tagData)
      .sort((a,b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([tag, d]) => {
        const dominantCat = d.categories.sort((a,b) =>
          d.categories.filter(c=>c===b).length - d.categories.filter(c=>c===a).length)[0];
        const topMoods = Object.entries(d.linkedMoods).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([m])=>m);
        return { tag, count: d.count, linkedMoods: topMoods, color: moodColor(dominantCat) };
      });

    // Correlation pairs
    const correlations: Array<{ tags: string[]; outcome: string; frequency: number }> = [];
    const pairMap: Record<string, { outcomes: Record<string, number> }> = {};

    logs.forEach(l => {
      const tags = (l.tags || []).slice(0, 3);
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const key = [tags[i], tags[j]].sort().join('||');
          if (!pairMap[key]) pairMap[key] = { outcomes: {} };
          pairMap[key].outcomes[l.moodName] = (pairMap[key].outcomes[l.moodName] || 0) + 1;
        }
      }
    });

    Object.entries(pairMap).forEach(([key, d]) => {
      const [top] = Object.entries(d.outcomes).sort((a,b)=>b[1]-a[1]);
      if (top && top[1] >= 2) {
        correlations.push({ tags: key.split('||'), outcome: top[0], frequency: top[1] });
      }
    });

    return {
      hasData: true,
      topTriggers,
      correlations: correlations.sort((a,b)=>b.frequency-a.frequency).slice(0, 4),
    };
  }

  // ─── NEW: Recovery Effectiveness ──────────────────────────────────────────
  async getRecoveryEffectiveness(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const recoveries = await this.recoveryLogModel.find({ userId, createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(100);

    if (!recoveries.length) return { hasData: false, tools: [], bestTool: null };

    const toolMap: Record<string, { helped: number; total: number }> = {};
    recoveries.forEach(r => {
      const key = r.suggestionId || 'Unknown';
      if (!toolMap[key]) toolMap[key] = { helped: 0, total: 0 };
      toolMap[key].total++;
      if (r.didHelp) toolMap[key].helped++;
    });

    const tools = Object.entries(toolMap).map(([name, d]) => ({
      name, usageCount: d.total,
      helpedPercent: Math.round((d.helped / d.total) * 100),
    })).sort((a,b) => b.helpedPercent - a.helpedPercent);

    return { hasData: true, tools, bestTool: tools[0]?.name ?? null };
  }

  // ─── NEW: Weekly Insights ─────────────────────────────────────────────────
  async getWeeklyInsights(userId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const logs = await this.moodLogModel.find({ userId, createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(50);
    return {
      insights: generateWeeklyInsights(logs as unknown as MoodEntry[]),
      generatedAt: new Date(),
    };
  }

  // ─── NEW: Paginated History for Timeline ─────────────────────────────────
  async getHistoryPaged(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.moodLogModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.moodLogModel.countDocuments({ userId }),
    ]);

    const enriched = logs.map(log => ({
      id: log._id.toString(),
      moodName: log.moodName,
      category: log.category,
      intensity: log.intensity,
      tags: log.tags,
      notes: log.notes,
      aiSafetyFlag: log.aiSafetyFlag,
      followUpAnswers: log['followUpAnswers'] || [],
      createdAt: log['createdAt'],
      emoji: moodEmoji(log.moodName),
      color: moodColor(log.category),
    }));

    return {
      data: enriched,
      total,
      page,
      limit,
      hasMore: skip + logs.length < total,
    };
  }

  async getContextRules(userId: string, moodName: string, intensity: string, tags: string[]) {
    const moodKey = moodName.toUpperCase().replace(/\s+/g, '_');
    const config = MOOD_REGISTRY[moodKey] || MOOD_REGISTRY['NEUTRAL'];

    let questionKeys = [...config.questionIds];
    if (config.category === 'negative' && (intensity === 'extreme' || intensity === 'strong')) {
      questionKeys.push('bo_q3');
      questionKeys.push('safe_q1');
    }

    const questions = questionKeys.map(id => ({ id, text: MOOD_QUESTION_BANK[id] || 'Can you tell me more?' }));

    return {
      configuration: {
        themeClass: config.category.toUpperCase(),
        primaryColor: config.gradientHex[1],
        gradientHex: config.gradientHex,
        illustrationId: config.illustrationId,
        emoji: config.emoji,
        title: config.title,
        subtitle: config.subtitle,
        ctaLabel: config.ctaLabel,
      },
      questions,
    };
  }

  async logIntelligent(userId: string, dto: any) {
    let isCrisis = false;
    let crisisTriggers: string[] = [];
    const notesLower = (dto.answers || []).map((a: any) => a.answer).join(' ').toLowerCase();
    const crisisKeywords = ['hopeless', 'end it', 'can\'t take it', 'panic', 'die'];
    if (crisisKeywords.some(kw => notesLower.includes(kw))) {
      isCrisis = true;
      crisisTriggers.push('NLP Pattern Match');
    }

    const moodKey = (dto.mood || 'NEUTRAL').toUpperCase().replace(/\s+/g, '_');
    const config = MOOD_REGISTRY[moodKey] || MOOD_REGISTRY['NEUTRAL'];
    if (config.crisisThreshold && dto.intensity === 'extreme') {
      isCrisis = true;
      crisisTriggers.push('Intensity Threshold Match');
    }

    // 1. Save to Mongoose (Legacy/AI Context)
    const log = await this.moodLogModel.create({
      userId, moodName: dto.mood, category: config.category,
      intensity: dto.intensity, tags: dto.tags || [], notes: notesLower,
      aiSafetyFlag: isCrisis,
      followUpAnswers: dto.answers || [],
    });

    // 2. Save to Prisma (Analytics Source of Truth)
    const sleepHours = this.extractMetric(dto.answers || [], ['neu_q2', 'tired_q1', 'bo_q3', 'sleep_hours'], notesLower);
    const stressValue = this.extractMetric(dto.answers || [], ['str_q1', 'bo_q1', 'ang_q1', 'stress_level'], notesLower);
    const scaledScore = scoreMood({
      category: config.category,
      intensity: dto.intensity,
      moodName: dto.mood,
      tags: dto.tags || [],
      createdAt: new Date(),
    });

    await this.prisma.moodLog.create({
      data: {
        userId,
        score: Math.round(scaledScore),
        note: notesLower,
        sleepHours: sleepHours,
        stress: stressValue !== null ? Math.round(stressValue) : undefined,
        tags: {
          create: (dto.tags || []).map((tag: string) => ({ name: tag })),
        },
      },
    });

    this.logger.log(`Log saved to Prisma. Sleep: ${sleepHours}, Stress: ${stressValue}`);

    let immediateAction = { type: 'IMMEDIATE_ACTION', title: 'Take a Breath', desc: 'Pause and breathe slowly for 4 seconds.' };
    let toolRecommendation = { type: 'TOOL_RECOMMENDATION', title: 'Journal', desc: 'Write about how you feel.' };
    let journalPrompt = { type: 'REFLECTION_PROMPT', title: 'Reflect', desc: 'What do you need right now?' };

    if (config.category === 'negative') {
      immediateAction = { type: 'IMMEDIATE_ACTION', title: 'Drink Water and Rest', desc: 'Hydrate and step away for 5 minutes.' };
      toolRecommendation = { type: 'TOOL_RECOMMENDATION', title: 'Sleep Mode', desc: 'Start an ambient soundscape.' };
    } else if (config.category === 'positive') {
      immediateAction = { type: 'IMMEDIATE_ACTION', title: 'Acknowledge the Win', desc: 'You earned this moment.' };
      toolRecommendation = { type: 'TOOL_RECOMMENDATION', title: 'Save Memory', desc: 'Vault this feeling forever.' };
      journalPrompt = { type: 'REFLECTION_PROMPT', title: 'Reflect', desc: 'What made today so good?' };
    }

    await this.updateStreak(userId, new Date());

    if (isCrisis) {
      await this.crisisEventModel.create({
        userId, moodLogId: log._id.toString(),
        triggerKeyword: crisisTriggers.join(', '), riskLevel: 'high', actionTaken: false,
      });

      return {
        status: 'CRITICAL_INTERVENTION',
        logId: log._id.toString(),
        crisisResponse: {
          riskLevel: 'HIGH', category: config.category.toUpperCase(),
          triggerScreen: true,
          actions: [
            { type: 'HOTLINE', label: 'Call Support', action: 'tel:988' },
            { type: 'GROUNDING', label: '5-4-3-2-1 Technique' },
          ],
        },
      };
    }

    return {
      status: 'SUCCESS',
      logId: log._id.toString(),
      configuration: {
        themeClass: config.category.toUpperCase(),
        illustrationId: config.illustrationId,
        gradientHex: config.gradientHex,
        subtitle: config.subtitle,
        color: moodColor(config.category),
        emoji: config.emoji,
      },
      suggestions: [immediateAction, toolRecommendation, journalPrompt],
      quickTools: config.quickTools,
    };
  }

  async getSuggestions(userId: string, logId: string) {
    const log = await this.moodLogModel.findById(logId);
    if (!log) return [];

    let types: SuggestionType[] = [];
    if (log.aiSafetyFlag || log.category === 'critical') {
      types.push(SuggestionType.EMERGENCY_SUGGESTION, SuggestionType.IMMEDIATE_ACTION);
    } else if (log.category === 'positive') {
      types.push(SuggestionType.REFLECTION_PROMPT, SuggestionType.SOCIAL_SUGGESTION);
    } else {
      types.push(SuggestionType.TOOL_RECOMMENDATION, SuggestionType.REFLECTION_PROMPT);
    }

    const templates = [
      { title: 'Save to Memories', description: 'Capture this positive moment.', type: SuggestionType.REFLECTION_PROMPT, routeDest: '/mood/memory' },
      { title: 'Moon Breathing', description: 'Take 2 minutes to center.', type: SuggestionType.TOOL_RECOMMENDATION, routeDest: '/sleep/routine' },
      { title: 'Emergency Contact', description: 'You are not alone.', type: SuggestionType.EMERGENCY_SUGGESTION, routeDest: '/crisis' },
    ];

    return templates.filter(t => types.includes(t.type));
  }

  async saveMemory(userId: string, dto: any) {
    return this.moodMemoryModel.create({
      userId, moodLogId: dto.moodLogId, photoUrl: dto.photoUrl,
      gratitudeNote: dto.gratitudeNote, peopleInvolved: dto.peopleInvolved || [],
      memoryTags: dto.memoryTags || [],
    });
  }

  async triggerCrisis(userId: string, dto: any) {
    return this.crisisEventModel.create({
      userId, moodLogId: dto.moodLogId, triggerKeyword: dto.triggerKeyword || 'Manual Trigger',
      riskLevel: dto.riskLevel || 'severe', actionTaken: true, actionDetails: dto.actionDetails,
    });
  }

  async saveRecoveryFeedback(userId: string, dto: any) {
    return this.recoveryLogModel.create({
      userId, moodLogId: dto.moodLogId, suggestionId: dto.suggestionId,
      didHelp: dto.didHelp, userFeedback: dto.userFeedback,
    });
  }

  async generateAiComfort(prompt: string) {
    const logger = new Logger('MoodService');
    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL}/chat/generate`,
        { prompt },
        { headers: { 'X-Bridge-Secret': process.env.FASTAPI_BRIDGE_SECRET }, timeout: 90000 },
      );
      return { reply: aiResponse.data.reply || '' };
    } catch (error) {
      logger.error('AI comfort generation failed:', error.message);
      return { reply: '' };
    }
  }

  private extractMetric(answers: any[], targetIds: string[], notes?: string): number | null {
    // 1. Structured answer mapping (Primary)
    for (const ans of answers) {
      if (targetIds.includes(ans.questionId)) {
        const match = ans.answer.match(/(\d+(\.\d+)?)/);
        if (match) return parseFloat(match[0]);
      }
    }

    // 2. Regex fallback on notes (Secondary)
    if (notes) {
      const notesLower = notes.toLowerCase();
      if (targetIds.includes('sleep_hours') || targetIds.includes('neu_q2')) {
        const sleepMatch = notesLower.match(/sleep:\s*(\d+(\.\d+)?)/) || notesLower.match(/(\d+(\.\d+)?)\s*hours/);
        if (sleepMatch) return parseFloat(sleepMatch[1]);
      }
      if (targetIds.includes('stress_level') || targetIds.includes('str_q1')) {
        const stressMatch = notesLower.match(/stress:\s*(\d+(\.\d+)?)/) || notesLower.match(/stress\s*level\s*is\s*(\d+(\.\d+)?)/);
        if (stressMatch) return parseFloat(stressMatch[1]);
      }
    }

    return null;
  }

  private async updateStreak(userId: string, logDate: Date) {
    const streak = await this.prisma.moodStreak.findUnique({ where: { userId } });
    if (!streak) {
      await this.prisma.moodStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastLogDate: logDate },
      });
      return;
    }

    const lastDate = streak.lastLogDate;
    if (!lastDate) return;

    const diffDays = Math.round(Math.abs(logDate.getTime() - lastDate.getTime()) / (1000*60*60*24));

    let newCurrent = streak.currentStreak;
    if (diffDays === 0) { /* same day, no change */ }
    else if (diffDays === 1) { newCurrent += 1; }
    else { newCurrent = 1; }

    await this.prisma.moodStreak.update({
      where: { userId },
      data: {
        currentStreak: newCurrent,
        longestStreak: Math.max(newCurrent, streak.longestStreak),
        lastLogDate: logDate,
      },
    });
  }
}
