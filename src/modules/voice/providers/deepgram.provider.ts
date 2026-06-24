import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceProvider, VoiceTranscriptionResult } from './voice-provider.interface';
import axios from 'axios';

@Injectable()
export class DeepgramProvider implements VoiceProvider {
  private readonly logger = new Logger(DeepgramProvider.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPGRAM_API_KEY') || '';
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<VoiceTranscriptionResult> {
    if (!this.apiKey) {
      throw new Error('Deepgram API key not configured.');
    }

    try {
      this.logger.log('Sending audio to Deepgram API fallback');
      
      const response = await axios.post(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true',
        audioBuffer,
        {
          headers: {
            'Content-Type': mimeType || 'audio/mp4',
            Authorization: `Token ${this.apiKey}`,
          },
          timeout: 60000,
        },
      );

      const data = response.data;
      const channel = data.results?.channels[0];
      const alternatives = channel?.alternatives[0];
      
      return {
        transcript: alternatives?.transcript || '',
        originalLanguage: channel?.detected_language,
        confidence: alternatives?.confidence,
        durationSeconds: data.metadata?.duration,
        provider: 'Deepgram',
      };
    } catch (error) {
      this.logger.error(`Deepgram transcription failed: ${error.message}`);
      throw new Error(`Failed to transcribe via Deepgram: ${error.message}`);
    }
  }
}
