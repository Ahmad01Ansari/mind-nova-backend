import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MoodService } from './mood.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('moods')
@UseGuards(AuthGuard('jwt'))
export class MoodController {
  constructor(private moodService: MoodService) {}

  // ─── Logging ───────────────────────────────────────────────────────────────

  @Post('log')
  createLog(@GetUser() user: User, @Body() dto: any) {
    return this.moodService.createLog(user.id, dto);
  }

  @Post('log-intelligent')
  logIntelligent(@GetUser() user: User, @Body() dto: any) {
    return this.moodService.logIntelligent(user.id, dto);
  }

  // ─── Context & Questions ────────────────────────────────────────────────────

  @Get('context-rules')
  getContextRules(
    @GetUser() user: User,
    @Query('mood') mood: string,
    @Query('intensity') intensity: string,
    @Query('tags') tags?: string,
  ) {
    return this.moodService.getContextRules(user.id, mood, intensity, tags ? tags.split(',') : []);
  }

  @Get('suggestions')
  getSuggestions(@GetUser() user: User, @Query('logId') logId: string) {
    return this.moodService.getSuggestions(user.id, logId);
  }

  // ─── History ────────────────────────────────────────────────────────────────

  @Get('history')
  getHistory(@GetUser() user: User) {
    return this.moodService.getHistory(user.id);
  }

  /** Paginated history for the emotional timeline screen */
  @Get('history-paged')
  getHistoryPaged(
    @GetUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moodService.getHistoryPaged(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ─── Analytics Endpoints ────────────────────────────────────────────────────

  /**
   * GET /moods/home-widget
   * Returns latest mood + streak + 7-day sparkline for the Home screen card.
   */
  @Get('home-widget')
  getHomeWidget(@GetUser() user: User) {
    return this.moodService.getHomeWidget(user.id);
  }

  /**
   * GET /moods/trend?days=7
   * Fixed: returns computed {score, date, mood, category, color, emoji}[].
   */
  @Get('trend')
  getTrend(@GetUser() user: User, @Query('days') days?: string) {
    return this.moodService.getTrend(user.id, days ? parseInt(days) : 7);
  }

  /**
   * GET /moods/analytics-summary?days=7
   * Returns dominant mood, weekly score, delta vs previous period, important moments.
   */
  @Get('analytics-summary')
  getAnalyticsSummary(@GetUser() user: User, @Query('days') days?: string) {
    return this.moodService.getAnalyticsSummary(user.id, days ? parseInt(days) : 7);
  }

  /**
   * GET /moods/distribution?days=30
   * Returns positive/neutral/negative/critical percentages + breakdown by mood.
   */
  @Get('distribution')
  getMoodDistribution(@GetUser() user: User, @Query('days') days?: string) {
    return this.moodService.getMoodDistribution(user.id, days ? parseInt(days) : 30);
  }

  /**
   * GET /moods/triggers?days=30
   * Returns top trigger tags with frequency, linked moods, and correlation pairs.
   */
  @Get('triggers')
  getTriggerAnalysis(@GetUser() user: User, @Query('days') days?: string) {
    return this.moodService.getTriggerAnalysis(user.id, days ? parseInt(days) : 30);
  }

  /**
   * GET /moods/recovery-effectiveness
   * Returns which tools helped the user the most.
   */
  @Get('recovery-effectiveness')
  getRecoveryEffectiveness(@GetUser() user: User, @Query('days') days?: string) {
    return this.moodService.getRecoveryEffectiveness(user.id, days ? parseInt(days) : 30);
  }

  /**
   * GET /moods/weekly-insights
   * Returns 3–5 rule-based personalized insight strings.
   */
  @Get('weekly-insights')
  getWeeklyInsights(@GetUser() user: User, @Query('days') days?: string) {
    return this.moodService.getWeeklyInsights(user.id, days ? parseInt(days) : 7);
  }

  /** Alias for weekly-insights to support legacy mobile app calls */
  @Get('insights')
  getInsights(@GetUser() user: User, @Query('days') days?: string) {
    return this.moodService.getWeeklyInsights(user.id, days ? parseInt(days) : 7);
  }

  /**
   * GET /moods/streak
   * Returns current and longest streaks.
   */
  @Get('streak')
  getStreak(@GetUser() user: User) {
    return this.moodService.getStreak(user.id);
  }

  // ─── Supporting Features ────────────────────────────────────────────────────

  @Post('memory')
  saveMemory(@GetUser() user: User, @Body() dto: any) {
    return this.moodService.saveMemory(user.id, dto);
  }

  @Post('crisis')
  triggerCrisis(@GetUser() user: User, @Body() dto: any) {
    return this.moodService.triggerCrisis(user.id, dto);
  }

  @Post('feedback')
  saveRecoveryFeedback(@GetUser() user: User, @Body() dto: any) {
    return this.moodService.saveRecoveryFeedback(user.id, dto);
  }

  @Post('ai-comfort')
  generateComfort(@GetUser() user: User, @Body() dto: { prompt: string }) {
    return this.moodService.generateAiComfort(dto.prompt);
  }
}
