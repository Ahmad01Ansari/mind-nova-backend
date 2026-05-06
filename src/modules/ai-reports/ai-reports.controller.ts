import { Controller, Get, Post, Param, UseGuards, Body, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsScheduler } from './reports.scheduler';
import { WeeklyReportsService } from './weekly-reports.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';

@Controller('reports')
export class AiReportsController {
  constructor(
    private readonly scheduler: ReportsScheduler,
    private readonly prisma: PrismaService,
    private readonly weeklyReportsService: WeeklyReportsService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════
  //  WEEKLY REPORT ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * GET /reports/weekly/latest
   * Returns latest report or a starter JSON (never throws 404).
   */
  @Get('weekly/latest')
  @UseGuards(AuthGuard('jwt'))
  async getLatestWeeklyReport(@GetUser() user: User) {
    const report = await this.prisma.weeklyReport.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      return this.buildStarterReport(user.id);
    }

    return report;
  }

  /**
   * GET /reports/weekly/history
   * Returns paginated list of past weekly reports.
   */
  @Get('weekly/history')
  @UseGuards(AuthGuard('jwt'))
  async getWeeklyReportHistory(@GetUser() user: User) {
    const reports = await this.prisma.weeklyReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12, // Last 12 weeks
    });
    return reports;
  }

  /**
   * GET /reports/weekly/:id
   * Returns a specific report by ID (must belong to the authenticated user).
   */
  @Get('weekly/:id')
  @UseGuards(AuthGuard('jwt'))
  async getWeeklyReportById(@Param('id') id: string, @GetUser() user: User) {
    const report = await this.prisma.weeklyReport.findFirst({
      where: { id, userId: user.id },
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return report;
  }

  /**
   * POST /reports/weekly/trigger
   * Manual generation for authenticated user. Rate limited to 1 per 6 hours.
   */
  @Post('weekly/trigger')
  @UseGuards(AuthGuard('jwt'))
  async triggerWeeklyReport(@GetUser() user: User) {
    return this.scheduler.triggerManualDispatch(user.id);
  }

  /**
   * GET /reports/weekly/:id/export
   * Returns the raw report JSON for export. PDF export stubbed for future.
   */
  @Get('weekly/:id/export')
  @UseGuards(AuthGuard('jwt'))
  async exportWeeklyReport(@Param('id') id: string, @GetUser() user: User) {
    const report = await this.prisma.weeklyReport.findFirst({
      where: { id, userId: user.id },
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    // Mark as exported
    await this.prisma.weeklyReport.update({
      where: { id },
      data: { isExported: true },
    });

    return {
      exportFormat: 'json',
      exportedAt: new Date().toISOString(),
      report,
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  //  PREDICTION PROXY ENDPOINTS (unchanged from Phase 6)
  // ══════════════════════════════════════════════════════════════════════

  @Post('predict/:type')
  @UseGuards(AuthGuard('jwt'))
  async predictModel(
    @GetUser() user: User,
    @Param('type') type: string,
    @Body() payload: any,
  ) {
    const validTypes = ['anxiety', 'depression', 'burnout', 'stress', 'deterioration'];
    if (!validTypes.includes(type)) {
      throw new NotFoundException(`Invalid prediction type: ${type}`);
    }

    try {
      const requestPayload = { ...payload, userId: user.id };
      const aiServiceUrl = process.env.AI_SERVICE_URL;
      if (!aiServiceUrl) throw new Error('AI_SERVICE_URL not defined');
      const response = await axios.post(
        `${aiServiceUrl}/predict/${type}`,
        requestPayload,
        {
          headers: {
            'X-Bridge-Secret': process.env.FASTAPI_BRIDGE_SECRET || 'mock_secret',
            'Content-Type': 'application/json',
          },
          timeout: 25000, // Reduced to 25s to return fallback before Render's 30s proxy timeout
        },
      );
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error(`AI Proxy Error [${type}]:`, error?.response?.data || error.message);
      return {
        success: false,
        predictionType: type,
        message: 'AI Engine is warming up',
        score: 0,
        riskLevel: 'PENDING',
        confidence: 'None',
        inputCompleteness: 0,
        contributors: [],
        title: 'Engine Warming Up',
        summary: 'Our AI infrastructure is currently waking up from an idle state. This usually takes about 30-60 seconds on our free tier.',
        actions: ['Wait 30 seconds and try again', 'Ensure your data inputs are accurate'],
        aiAvailable: false,
        generatedAt: new Date().toISOString(),
        modelVersion: 'fallback',
        pipelineVersion: 'phase6.2_controlled_fallback',
      };
    }
  }

  @Get('insight/:id')
  @UseGuards(AuthGuard('jwt'))
  async getInsight(@Param('id') id: string, @GetUser() user: User) {
    const insight = await this.prisma.aiInsight.findUnique({
      where: { id, userId: user.id },
    });

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    return insight;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  STARTER REPORT (premium empty state)
  // ══════════════════════════════════════════════════════════════════════

  private buildStarterReport(userId: string) {
    return {
      id: 'starter',
      userId,
      isStarter: true,
      weekStartDate: new Date().toISOString(),
      weekEndDate: new Date().toISOString(),
      avgMoodScore: 0,
      moodTrend: 'FLAT',
      moodLogCount: 0,
      avgSleepHours: null,
      sleepConsistency: null,
      stressAvg: null,
      burnoutRisk: null,
      anxietyTrend: null,
      depressionTrend: null,
      gratitudeCount: 0,
      journalCount: 0,
      meditationMinutes: 0,
      groundingSessions: 0,
      audioMinutes: 0,
      emotionalVolatility: null,
      recoveryScore: null,
      wellnessScore: null,
      engagementScore: 0,
      cmhiWeeklyScore: null,
      streakScore: 0,
      aiSummary: 'Your first weekly insight starts building now. Log your moods, practice gratitude, and use the wellness tools — your personalized report will be ready this Sunday.',
      aiTitle: 'Your Journey Begins ✨',
      aiWhatHelped: null,
      aiChallenges: null,
      aiComparison: null,
      aiRecommendations: [
        'Log your mood at least once today',
        'Try a 5-minute meditation session',
        'Write one gratitude entry',
      ],
      aiEncouragement: 'Every journey starts with a single step. We\'re here to walk with you. 🌟',
      previousWellnessScore: null,
      previousMoodScore: null,
      weekDelta: null,
      improved: null,
      crisisRiskLevel: 'LOW',
      dataCompleteness: 0,
      dataConfidence: 'STARTER',
      reportVersion: '2.0',
      isShared: false,
      isExported: false,
      createdAt: new Date().toISOString(),
    };
  }
}
