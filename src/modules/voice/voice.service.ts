import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FasterWhisperProvider } from './providers/faster-whisper.provider';
import { WhisperApiProvider } from './providers/whisper-api.provider';
import { DeepgramProvider } from './providers/deepgram.provider';
import { VoiceTranscriptionResult } from './providers/voice-provider.interface';
import { AiService } from '../ai/ai.service';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly fasterWhisper: FasterWhisperProvider,
    private readonly whisperApi: WhisperApiProvider,
    private readonly deepgramApi: DeepgramProvider,
    private readonly aiService: AiService,
  ) {}

  async transcribeAndStore(
    userId: string,
    featureType: string,
    audioBuffer: Buffer,
    mimeType: string,
    filename: string,
    retentionSetting: boolean = false,
  ) {
    this.logger.log(`Processing voice entry for user ${userId}, feature: ${featureType}`);
    
    let transcriptionResult: VoiceTranscriptionResult;

    // 1. Fallback Chain: Faster-Whisper -> Whisper API -> Deepgram
    try {
      transcriptionResult = await this.fasterWhisper.transcribe(audioBuffer, mimeType, filename);
    } catch (e1) {
      this.logger.warn(`FasterWhisper failed, falling back to Whisper API: ${e1.message}`);
      try {
        transcriptionResult = await this.whisperApi.transcribe(audioBuffer, mimeType, filename);
      } catch (e2) {
        this.logger.warn(`Whisper API failed, falling back to Deepgram API: ${e2.message}`);
        try {
          transcriptionResult = await this.deepgramApi.transcribe(audioBuffer, mimeType, filename);
        } catch (e3) {
          this.logger.error(`All STT providers failed! Last error: ${e3.message}`);
          throw new Error('All Voice transcription providers failed.');
        }
      }
    }
    
    // 2. Optionally upload audio to Supabase/S3 if retention is ON
    let audioUrl: string | null = null;
    if (retentionSetting) {
      // TODO: Call Storage service to upload the M4A file
      // audioUrl = await this.storageService.upload(audioBuffer, ...);
      this.logger.log(`Audio retention is ON. Audio should be uploaded to storage.`);
      audioUrl = `https://storage.placeholder.com/${filename}`;
    }

    // 3. Store in database
    const voiceEntry = await this.prisma.voiceEntry.create({
      data: {
        userId,
        featureType,
        audioUrl,
        originalLanguage: transcriptionResult.originalLanguage,
        originalTranscript: transcriptionResult.transcript,
        translatedEnglish: transcriptionResult.translatedEnglish,
        transcriptionConfidence: transcriptionResult.confidence,
        durationSeconds: transcriptionResult.durationSeconds,
        processingProvider: transcriptionResult.provider,
      },
    });

    return voiceEntry;
  }

  async analyzeEmotion(voiceEntryId: string) {
    const voiceEntry = await this.prisma.voiceEntry.findUnique({
      where: { id: voiceEntryId },
    });

    if (!voiceEntry) {
      throw new NotFoundException('Voice Entry not found');
    }

    const aiResult = await this.aiService.analyzeVoiceEmotion(voiceEntry.originalTranscript);

    // Save result back to VoiceEntry
    await this.prisma.voiceEntry.update({
      where: { id: voiceEntryId },
      data: {
        sentimentScore: aiResult.confidence, // Store confidence in score column for now
        emotionData: JSON.parse(JSON.stringify(aiResult)), // Ensure JSON compatibility
      },
    });

    return aiResult;
  }
}
