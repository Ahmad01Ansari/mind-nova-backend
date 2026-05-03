import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AdaptiveQuestionTree extends Document {
  @Prop({ required: true, unique: true, index: true })
  treeId: string; // e.g. 'main_clinical_tree'

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  startingQuestionId: string; // The root node of the tree

  @Prop({ type: [String], default: ['QUICK', 'STANDARD', 'DEEP', 'CRISIS'] })
  supportedModes: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const AdaptiveQuestionTreeSchema = SchemaFactory.createForClass(AdaptiveQuestionTree);
