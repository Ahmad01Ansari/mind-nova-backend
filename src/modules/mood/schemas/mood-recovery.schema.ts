import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MoodRecoveryLogDocument = MoodRecoveryLog & Document;

@Schema({ timestamps: true })
export class MoodRecoveryLog {
  @Prop({ required: true })
  userId: string;
  
  @Prop({ required: true })
  moodLogId: string; // The original mood log causing the suggestion

  @Prop({ required: true })
  suggestionId: string; // The ID of the suggestion taken

  @Prop({ required: true })
  didHelp: boolean; // "Did this help?" prompt answer

  @Prop()
  userFeedback?: string; // Optional detailed feedback string
}

export const MoodRecoveryLogSchema = SchemaFactory.createForClass(MoodRecoveryLog);
