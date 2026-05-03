import { Module } from '@nestjs/common';
import { RecoveryService } from './recovery.service';
import { RecoveryController } from './recovery.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecoveryController],
  providers: [RecoveryService],
  exports: [RecoveryService],
})
export class RecoveryModule {}
