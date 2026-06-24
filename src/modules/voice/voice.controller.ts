import { Controller, Post, Body, UploadedFile, UseInterceptors, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async transcribe(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('featureType') featureType: string,
    @Body('keepRecording') keepRecording: string,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }
    
    if (!featureType) {
      throw new BadRequestException('featureType is required');
    }

    const userId = req.user.id;
    const retentionSetting = keepRecording === 'true';

    const result = await this.voiceService.transcribeAndStore(
      userId,
      featureType,
      file.buffer,
      file.mimetype,
      file.originalname,
      retentionSetting,
    );

    return {
      voiceEntryId: result.id,
      audioUrl: result.audioUrl,
      originalLanguage: result.originalLanguage,
      originalTranscript: result.originalTranscript,
      translatedEnglish: result.translatedEnglish,
      confidence: result.transcriptionConfidence,
      durationSeconds: result.durationSeconds,
    };
  }

  @Post('analyze-emotion')
  @UseGuards(AuthGuard('jwt'))
  async analyzeEmotion(@Body('voiceEntryId') voiceEntryId: string) {
    if (!voiceEntryId) {
      throw new BadRequestException('voiceEntryId is required');
    }
    return await this.voiceService.analyzeEmotion(voiceEntryId);
  }
}
