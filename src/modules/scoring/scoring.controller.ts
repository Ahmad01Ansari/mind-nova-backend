import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScoringEngineService } from './services/scoring-engine.service';
import { InsightGenerationService } from './services/insight-generation.service';
import { GrowthService } from './services/growth.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('scoring')
@UseGuards(AuthGuard('jwt'))
export class ScoringController {
  constructor(
    private readonly scoringEngine: ScoringEngineService,
    private readonly insightService: InsightGenerationService,
    private readonly growthService: GrowthService,
    private readonly prisma: PrismaService
  ) {}

  @Post('calculate')
  async calculateScore(@Request() req, @Body() body: any) {
    const userId = req.user.id;
    
    // If no specific scores are provided in the body, don't generate a new 'dummy' score.
    // Instead, return the most recent existing score for this user.
    if (!body.emotional && !body.cognitive && !body.behavioral && !body.physiological && !body.temporal) {
      const latest = await this.prisma.multiDimensionalScore.findFirst({
        where: { userId },
        orderBy: { calculatedAt: 'desc' },
        include: { explanation: true }
      });
      return latest || null;
    }

    const input = {
      emotional: body.emotional,
      cognitive: body.cognitive,
      behavioral: body.behavioral,
      physiological: body.physiological,
      temporal: body.temporal
    };
    
    return this.scoringEngine.calculateAndSaveScore(userId, input, body.isCrisis);
  }

  @Get('insight/:scoreId')
  async getInsight(@Param('scoreId') scoreId: string) {
    // Returns or generates insight specifically for this score instance
    let explanation = await this.prisma.scoreExplanation.findUnique({
      where: { scoreId }
    });

    if (!explanation) {
      explanation = await this.insightService.generateInsight(scoreId);
    }
    return explanation;
  }

  @Get('history')
  async getHistory(@Request() req) {
    return this.prisma.multiDimensionalScore.findMany({
      where: { userId: req.user.id },
      orderBy: { calculatedAt: 'desc' },
      take: 7, 
      include: { explanation: true }
    });
  }

  @Get('growth')
  async getGrowth(@Request() req) {
    return this.growthService.getGrowthSummary(req.user.id);
  }
}
