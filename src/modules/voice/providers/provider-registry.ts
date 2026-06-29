import { Injectable, Logger } from '@nestjs/common';
import { VoiceProvider, VoiceTranscriptionResult } from './voice-provider.interface';
import { FasterWhisperProvider } from './faster-whisper.provider';
import { WhisperApiProvider } from './whisper-api.provider';
import { DeepgramProvider } from './deepgram.provider';

@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private providers: VoiceProvider[] = [];

  constructor(
    private readonly fasterWhisper: FasterWhisperProvider,
    private readonly whisperApi: WhisperApiProvider,
    private readonly deepgramApi: DeepgramProvider,
  ) {
    this.register(this.fasterWhisper);
    this.register(this.whisperApi);
    this.register(this.deepgramApi);
  }

  private register(provider: VoiceProvider) {
    this.providers.push(provider);
    this.providers.sort((a, b) => {
      // Prioritize local providers first
      if (a.isLocal !== b.isLocal) {
        return a.isLocal ? -1 : 1;
      }
      // Then sort by priority
      return a.priority - b.priority;
    });
    this.logger.log(`Registered Voice Provider: ${provider.name} (Priority: ${provider.priority}, Local: ${provider.isLocal})`);
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<VoiceTranscriptionResult> {
    const availableProviders = this.providers.filter(p => p.isAvailable());

    if (availableProviders.length === 0) {
      throw new Error('No voice providers are currently available or configured.');
    }

    for (const provider of availableProviders) {
      try {
        this.logger.debug(`Attempting transcription via ${provider.name}...`);
        return await provider.transcribe(audioBuffer, mimeType, filename);
      } catch (error) {
        this.logger.warn(`Provider ${provider.name} failed: ${error.message}`);
        // Continue to the next provider in the fallback chain
        continue;
      }
    }

    this.logger.error('All STT providers in the fallback chain failed.');
    throw new Error('All Voice transcription providers failed.');
  }
}
