import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: ['user', 'ai'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  sessionId?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
