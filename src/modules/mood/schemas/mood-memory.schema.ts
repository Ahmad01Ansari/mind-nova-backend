import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MoodMemoryDocument = MoodMemory & Document;

@Schema({ timestamps: true })
export class MoodMemory {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  moodLogId: string; // Link to the original positive mood log

  @Prop()
  photoUrl?: string;

  @Prop()
  gratitudeNote?: string;

  @Prop({ type: [String], default: [] })
  peopleInvolved?: string[];

  @Prop({ type: [String], default: [] })
  memoryTags?: string[];

  @Prop({ default: false })
  revisitFlag?: boolean; // If they want the AI to occasionally remind them of this memory
}

export const MoodMemorySchema = SchemaFactory.createForClass(MoodMemory);
