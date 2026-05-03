import { Module } from '@nestjs/common';
import { CrisisService } from './crisis.service';
import { CrisisController } from './crisis.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CrisisController],
  providers: [CrisisService],
  exports: [CrisisService],
})
export class CrisisModule {}
