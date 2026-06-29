import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VoiceProvider, VoiceTranscriptionResult } from './voice-provider.interface';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class FasterWhisperProvider implements VoiceProvider {
  private readonly logger = new Logger(FasterWhisperProvider.name);
  private readonly aiServiceUrl: string;

  public readonly name = 'Faster-Whisper';
  public readonly priority = 1;
  public readonly isLocal = true;

  isAvailable(): boolean {
    return !!this.aiServiceUrl;
  }

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://127.0.0.1:8000';
  }

  @Cron('*/14 * * * *') // Run every 14 minutes
  async keepWarm() {
    if (!this.isAvailable()) return;
    try {
      this.logger.debug(`Pinging AI service to pre-warm Whisper model...`);
      const response = await axios.get(`${this.aiServiceUrl}/voice/warmup`, { timeout: 30000 });
      this.logger.debug(`AI Warmup successful: ${response.data.loadTimeMs}ms`);
    } catch (e) {
      this.logger.warn(`AI Warmup ping failed: ${e.message}`);
    }
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<VoiceTranscriptionResult> {
    try {
      this.logger.log(`Sending audio to Faster-Whisper at ${this.aiServiceUrl}/voice/transcribe`);
      
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename,
        contentType: mimeType,
      });

      const response = await axios.post(`${this.aiServiceUrl}/voice/transcribe`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 300000, // 300s (5min) timeout to handle cold-starts and large model downloads
      });

      const data = response.data;
      
      return {
        transcript: data.transcript || data.originalTranscript,
        originalLanguage: data.originalLanguage || 'Unknown',
        translatedEnglish: data.translatedEnglish,
        confidence: data.confidence,
        durationSeconds: data.durationSeconds,
        processingTimeMs: data.processingTimeMs,
        segments: data.segments,
        provider: this.name,
      };
    } catch (error) {
      if (error.response) {
        this.logger.error(`Faster-Whisper transcription failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        require('fs').writeFileSync('/tmp/faster_whisper_error.txt', JSON.stringify(error.response.data));
      } else {
        this.logger.error(`Faster-Whisper transcription failed: ${error.message}`);
        require('fs').writeFileSync('/tmp/faster_whisper_error.txt', error.message);
      }
      // Return a fallback so the app doesn't crash completely, or re-throw
      throw new Error(`Failed to transcribe audio via Faster-Whisper: ${error.message}`);
    }
  }
}
