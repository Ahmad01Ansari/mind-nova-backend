import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MoodService } from './mood.service';
import { MoodController } from './mood.controller';
import { MoodContext, MoodContextSchema } from './schemas/mood-context.schema';
import { MoodLog, MoodLogSchema } from './schemas/mood-log.schema';
import { MoodMemory, MoodMemorySchema } from './schemas/mood-memory.schema';
import { MoodCrisisEvent, MoodCrisisEventSchema } from './schemas/mood-crisis.schema';
import { MoodSuggestion, MoodSuggestionSchema } from './schemas/mood-suggestion.schema';
import { MoodRecoveryLog, MoodRecoveryLogSchema } from './schemas/mood-recovery.schema';
import { CrisisModule } from '../crisis/crisis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MoodContext.name, schema: MoodContextSchema },
      { name: MoodLog.name, schema: MoodLogSchema },
      { name: MoodMemory.name, schema: MoodMemorySchema },
      { name: MoodCrisisEvent.name, schema: MoodCrisisEventSchema },
      { name: MoodSuggestion.name, schema: MoodSuggestionSchema },
      { name: MoodRecoveryLog.name, schema: MoodRecoveryLogSchema },
    ]),
    CrisisModule,
  ],
  controllers: [MoodController],
  providers: [MoodService],
})
export class MoodModule {}

