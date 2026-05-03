import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { Questionnaire, QuestionnaireSchema, AssessmentSession, AssessmentSessionSchema } from './schema/assessment.schema';

import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    ScoringModule,
    MongooseModule.forFeature([
      { name: Questionnaire.name, schema: QuestionnaireSchema },
      { name: AssessmentSession.name, schema: AssessmentSessionSchema },
    ]),
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService],
})
export class AssessmentModule {}

