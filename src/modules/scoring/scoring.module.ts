import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScoringController } from './scoring.controller';
import { ScoringEngineService } from './services/scoring-engine.service';
import { InsightGenerationService } from './services/insight-generation.service';
import { ScoreHistory, ScoreHistorySchema } from './schemas/score-history.schema';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GrowthService } from './services/growth.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScoreHistory.name, schema: ScoreHistorySchema }
    ])
  ],
  controllers: [ScoringController],
  providers: [ScoringEngineService, InsightGenerationService, PrismaService, GrowthService],
  exports: [ScoringEngineService, InsightGenerationService]
})
export class ScoringModule {}
