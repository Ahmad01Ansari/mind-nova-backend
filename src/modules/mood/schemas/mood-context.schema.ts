import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MoodContextDocument = MoodContext & Document;

@Schema({ timestamps: true })
export class MoodContext {
  @Prop({ required: true })
  moodLogId: string;

  @Prop({ required: true })
  userId: string;

  @Prop()
  notes?: string;

  @Prop()
  journalRef?: string;

  @Prop({ type: Object })
  location?: { name?: string; lat?: number; long?: number };

  @Prop({ type: Object })
  weather?: { condition?: string; tempC?: number };

  @Prop({ type: [Object], default: [] })
  followUpAnswers?: Array<{ questionId: string; answer: string }>;

  @Prop()
  aiRecommendationGen?: string;
}

export const MoodContextSchema = SchemaFactory.createForClass(MoodContext);
