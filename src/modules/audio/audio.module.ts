import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [AudioController],
  providers: [AudioService, SupabaseStorageService],
  exports: [AudioService],
})
export class AudioModule {}
