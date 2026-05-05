import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private readonly storageService: SupabaseStorageService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'chat-media',
    @Query('bucket') bucket: string = 'mindnova-assets'
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Sanitize filename
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${timestamp}_${originalName}`;

    try {
      const publicUrl = await this.storageService.uploadFile(
        bucket,
        folder,
        fileName,
        file.buffer,
        file.mimetype
      );

      return {
        success: true,
        url: publicUrl,
        fileName: fileName,
        mimetype: file.mimetype,
        size: file.size
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
