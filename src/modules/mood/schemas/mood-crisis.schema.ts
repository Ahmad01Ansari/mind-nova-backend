import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MoodCrisisEventDocument = MoodCrisisEvent & Document;

@Schema({ timestamps: true })
export class MoodCrisisEvent {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  moodLogId: string;

  @Prop({ required: true })
  triggerKeyword: string; // The NLP keyword or exact phrase that triggered the crisis check

  @Prop({ required: true })
  riskLevel: 'moderate' | 'high' | 'severe';

  @Prop({ default: false })
  actionTaken: boolean; // e.g., if user clicked the hotline or accepted the breathing exercise

  @Prop()
  actionDetails?: string; // what action was taken
}

export const MoodCrisisEventSchema = SchemaFactory.createForClass(MoodCrisisEvent);
