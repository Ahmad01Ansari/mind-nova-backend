import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ScoreHistory extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ type: Object, required: true })
  metrics: {
    phq9_input?: number;
    gad7_input?: number;
    sleep_hours?: number;
    sentiment_score?: number;
    missed_logs?: number;
    [key: string]: any;
  };

  @Prop({ type: Object, required: true })
  dynamicWeightsApplied: {
    emotionalWeight: number;
    cognitiveWeight: number;
    behavioralWeight: number;
    physiologicalWeight: number;
    temporalWeight: number;
  };

  @Prop({ required: true })
  calculatedCmhi: number;
}

export const ScoreHistorySchema = SchemaFactory.createForClass(ScoreHistory);

// Ensure optimal querying for time-series charts
ScoreHistorySchema.index({ userId: 1, date: -1 });
