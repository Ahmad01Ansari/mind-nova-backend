import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MoodLogDocument = MoodLog & Document;

export enum MoodCategory {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  CRITICAL = 'critical',
}

export enum MoodIntensity {
  MILD = 'mild',
  MODERATE = 'moderate',
  STRONG = 'strong',
  EXTREME = 'extreme',
}

@Schema({ timestamps: true })
export class MoodLog {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  moodName: string; // e.g., 'Overjoyed', 'Happy', 'Sad', 'Anxious'

  @Prop({ required: true, enum: MoodCategory })
  category: MoodCategory;

  @Prop({ required: true, enum: MoodIntensity })
  intensity: MoodIntensity;

  @Prop({ type: [String], default: [] })
  tags: string[]; // e.g., ['Work', 'Family', 'Sleep']

  @Prop()
  coreSentimentScore?: number; // AI NLP determined sentiment
  
  @Prop({ default: false })
  aiSafetyFlag?: boolean; // Flag if self-harm or crisis keywords detected

  @Prop()
  notes?: string;

  @Prop({ type: [Object], default: [] })
  followUpAnswers?: Array<{ questionId: string; answer: string }>;
}

export const MoodLogSchema = SchemaFactory.createForClass(MoodLog);
