import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class DependencyRule {
  @Prop({ required: true })
  prevQId: string;

  @Prop({ required: true })
  operator: string; // e.g., '>=', '<', '==', 'includes'

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  value: any;
}

@Schema({ _id: false })
export class FollowUpRule {
  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  answer: any;

  @Prop({ required: true })
  nextQId: string;
}

@Schema()
export class AdaptiveQuestionNode extends Document {
  @Prop({ required: true, unique: true, index: true })
  questionId: string; // Unique string identifier e.g. 'q_dep_01'

  @Prop({ required: true })
  category: string; // DEPRESSION, ANXIETY, BURN_OUT

  @Prop()
  subCategory: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  type: string; // SEVERITY_SCALE, YES_NO, etc.

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  options: any[]; // Array of option objects { text: String, score: Number }

  @Prop({ default: 1.0 })
  severityWeight: number;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  triggerConditions: any[]; // Conditions evaluated before queuing

  @Prop({ type: [DependencyRule], default: [] })
  dependencyRules: DependencyRule[];

  @Prop()
  parentQuestionId: string;

  @Prop({ type: [String], default: [] })
  childQuestionIds: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  crisisFlag: boolean;

  @Prop({ type: Object })
  scoreThresholds: { min: number; max: number };

  @Prop({ type: [FollowUpRule], default: [] })
  followUpRules: FollowUpRule[]; // Branching logic evaluations

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  skipLogic: any[];

  @Prop({ type: [String], default: ['ALL'] })
  targetUsers: string[];

  @Prop({ default: 15 })
  estimatedTime: number; // Time in seconds
}

export const AdaptiveQuestionNodeSchema = SchemaFactory.createForClass(AdaptiveQuestionNode);
