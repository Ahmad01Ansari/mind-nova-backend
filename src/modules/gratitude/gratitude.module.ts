import { Module } from '@nestjs/common';
import { GratitudeController } from './gratitude.controller';
import { GratitudeService } from './gratitude.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GratitudeController],
  providers: [GratitudeService],
})
export class GratitudeModule {}
