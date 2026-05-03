import { Module } from '@nestjs/common';
import { GroundingController } from './grounding.controller';
import { GroundingService } from './grounding.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroundingController],
  providers: [GroundingService],
  exports: [GroundingService],
})
export class GroundingModule {}
