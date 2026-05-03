import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdaptiveService } from './adaptive.service';
import { AdaptiveController } from './adaptive.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';
import { AdaptiveQuestionNode, AdaptiveQuestionNodeSchema } from './schema/adaptive-node.schema';
import { AdaptiveQuestionTree, AdaptiveQuestionTreeSchema } from './schema/adaptive-tree.schema';

@Module({
  imports: [
    PrismaModule,
    ScoringModule,
    MongooseModule.forFeature([
      { name: AdaptiveQuestionNode.name, schema: AdaptiveQuestionNodeSchema },
      { name: AdaptiveQuestionTree.name, schema: AdaptiveQuestionTreeSchema },
    ]),
  ],
  providers: [AdaptiveService],
  controllers: [AdaptiveController],
})
export class AdaptiveModule {}
