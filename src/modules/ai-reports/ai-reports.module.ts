import { Module } from '@nestjs/common';
import { ReportsScheduler } from './reports.scheduler';
import { AiReportsController } from './ai-reports.controller';
import { AiInsightService } from './ai-insight.service';
import { WeeklyReportsService } from './weekly-reports.service';

@Module({
  controllers: [AiReportsController],
  providers: [ReportsScheduler, WeeklyReportsService, AiInsightService],
  exports: [AiInsightService, WeeklyReportsService],
})
export class AiReportsModule {}
