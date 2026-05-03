import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionnaireDocument = Questionnaire & Document;

@Schema()
class Option {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  score: number;

  @Prop()
  branchTo?: string; // ID of the next question if this option is chosen
}

@Schema()
class Question {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  category: string; // e.g., 'Anxiety', 'Sleep', 'Depression'

  @Prop({ type: [Option], default: [] })
  options: Option[];
}

@Schema({ timestamps: true })
export class Questionnaire {
  @Prop({ required: true, unique: true })
  slug: string; // e.g., 'wellness-baseline', 'phq-9'

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: [Question], default: [] })
  questions: Question[];
}

@Schema({ timestamps: true })
export class AssessmentSession {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  assessmentId: string; // The UUID from PostgreSQL

  @Prop({ required: true })
  slug: string; // e.g., 'gad-7'

  @Prop({ type: Object, default: {} })
  answers: Record<string, number>;

  @Prop({ default: 0 })
  currentIndex: number;

  @Prop({ type: [String], default: [] })
  shuffledQuestionIds: string[];

  @Prop({ default: 'standard' })
  depth: string; // short | standard | advanced

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export type AssessmentSessionDocument = AssessmentSession & Document;
export const QuestionnaireSchema = SchemaFactory.createForClass(Questionnaire);
export const AssessmentSessionSchema = SchemaFactory.createForClass(AssessmentSession);
