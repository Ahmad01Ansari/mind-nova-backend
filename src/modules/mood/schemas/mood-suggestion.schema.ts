import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MoodSuggestionDocument = MoodSuggestion & Document;

export enum SuggestionType {
  IMMEDIATE_ACTION = 'immediate_action',
  REFLECTION_PROMPT = 'reflection_prompt',
  TOOL_RECOMMENDATION = 'tool_recommendation',
  SOCIAL_SUGGESTION = 'social_suggestion',
  SLEEP_SUGGESTION = 'sleep_suggestion',
  EMERGENCY_SUGGESTION = 'emergency_suggestion',
  THERAPIST_SUGGESTION = 'therapist_suggestion',
}

@Schema({ timestamps: true })
export class MoodSuggestion {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: SuggestionType })
  type: SuggestionType;

  @Prop()
  routeDest?: string; // App route to redirect to (e.g., '/sleep/sounds')

  @Prop()
  primaryContextKeyword?: string; // The primary driver for this suggestion (e.g., 'lonely', 'poor_sleep')
}

export const MoodSuggestionSchema = SchemaFactory.createForClass(MoodSuggestion);
