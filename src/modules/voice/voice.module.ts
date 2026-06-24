import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { FasterWhisperProvider } from './providers/faster-whisper.provider';
import { WhisperApiProvider } from './providers/whisper-api.provider';
import { DeepgramProvider } from './providers/deepgram.provider';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ConfigModule, AiModule],
  controllers: [VoiceController],
  providers: [
    VoiceService,
    FasterWhisperProvider,
    WhisperApiProvider,
    DeepgramProvider,
  ],
  exports: [VoiceService],
})
export class VoiceModule {}
