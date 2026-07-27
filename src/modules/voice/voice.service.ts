import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VoiceTranscriptionResult } from './providers/voice-provider.interface';
import { ProviderRegistry } from './providers/provider-registry';
import { AiService } from '../ai/ai.service';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly aiService: AiService,
    private readonly storageService: SupabaseStorageService,
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
    
    // 1. Transcription via Dynamic Provider Registry
    const transcriptionResult = await this.providerRegistry.transcribe(audioBuffer, mimeType, filename);
    
    // 2. Optionally upload audio to Supabase/S3 if retention is ON
    let audioUrl: string | null = null;
    let audioRetained = false;
    if (retentionSetting) {
      try {
        this.logger.log(`Audio retention is ON. Uploading to Supabase...`);
        const folder = `user-voice/${userId}/${featureType.toLowerCase()}`;
        const uniqueFilename = `${Date.now()}_${filename}`;
        audioUrl = await this.storageService.uploadFile('user-uploads', folder, uniqueFilename, audioBuffer, mimeType);
        audioRetained = true;
      } catch (err) {
        this.logger.error(`Failed to upload retained audio: ${err.message}`);
        // We still save the transcription, but audio retention failed
        audioRetained = false;
      }
    }

    // 3. Store in database with Phase 1 metadata
    const voiceEntry = await this.prisma.voiceEntry.create({
      data: {
        userId,
        featureType,
        audioUrl,
        audioRetained,
        originalLanguage: transcriptionResult.originalLanguage,
        originalTranscript: transcriptionResult.transcript,
        translatedEnglish: transcriptionResult.translatedEnglish,
        transcriptionConfidence: transcriptionResult.confidence,
        languageConfidence: transcriptionResult.languageConfidence,
        durationSeconds: transcriptionResult.durationSeconds,
        processingProvider: transcriptionResult.provider,
        processingTimeMs: transcriptionResult.processingTimeMs,
        segments: transcriptionResult.segments,
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

  async deleteEntry(userId: string, entryId: string) {
    const voiceEntry = await this.prisma.voiceEntry.findUnique({
      where: { id: entryId },
    });

    if (!voiceEntry || voiceEntry.userId !== userId) {
      throw new NotFoundException('Voice Entry not found or unauthorized');
    }

    // Attempt to delete audio file if it was retained
    if (voiceEntry.audioRetained && voiceEntry.audioUrl) {
      try {
        const urlObj = new URL(voiceEntry.audioUrl);
        const pathParts = urlObj.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf('user-uploads') + 1).join('/');
        
        // Use Supabase JS client to delete (SupabaseStorageService needs a delete method, or we can just ignore for now if not implemented)
        // TODO: implement deleteFile in storageService
      } catch (err) {
        this.logger.warn(`Failed to parse or delete audio file for entry ${entryId}: ${err.message}`);
      }
    }

    await this.prisma.voiceEntry.delete({
      where: { id: entryId },
    });

    return { message: 'Voice entry deleted successfully' };
  }

  async purgeUserData(userId: string) {
    this.logger.log(`Purging all voice entries for user: ${userId}`);
    // Ideally we would delete all storage files here too by listing and deleting
    
    const result = await this.prisma.voiceEntry.deleteMany({
      where: { userId },
    });

    return { message: `Purged ${result.count} voice entries successfully` };
  }
}
