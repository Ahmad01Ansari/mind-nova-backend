import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceProvider, VoiceTranscriptionResult } from './voice-provider.interface';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class WhisperApiProvider implements VoiceProvider {
  private readonly logger = new Logger(WhisperApiProvider.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<VoiceTranscriptionResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured.');
    }

    try {
      this.logger.log('Sending audio to OpenAI Whisper API fallback');
      
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename,
        contentType: mimeType,
      });
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');

      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 60000,
      });

      const data = response.data;
      
      return {
        transcript: data.text,
        originalLanguage: data.language,
        confidence: 0.9, // OpenAI doesn't return confidence easily
        durationSeconds: data.duration,
        provider: 'OpenAI-Whisper',
      };
    } catch (error) {
      this.logger.error(`OpenAI Whisper transcription failed: ${error.message}`);
      throw new Error(`Failed to transcribe via OpenAI Whisper: ${error.message}`);
    }
  }
}
