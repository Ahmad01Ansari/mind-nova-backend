import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { FasterWhisperProvider } from './providers/faster-whisper.provider';
import { WhisperApiProvider } from './providers/whisper-api.provider';
import { DeepgramProvider } from './providers/deepgram.provider';
import { ProviderRegistry } from './providers/provider-registry';
import { AiModule } from '../ai/ai.module';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

@Module({
  imports: [ConfigModule, AiModule],
  controllers: [VoiceController],
  providers: [
    VoiceService,
    FasterWhisperProvider,
    WhisperApiProvider,
    DeepgramProvider,
    ProviderRegistry,
    SupabaseStorageService,
  ],
  exports: [VoiceService],
})
export class VoiceModule {}
