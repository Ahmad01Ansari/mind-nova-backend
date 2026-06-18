import { Controller, Get, Patch, Post, Body, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { UsersService, UpdateProfileDto } from './users.service';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: SupabaseStorageService
  ) {}

  @Get('profile')
  getProfile(@Request() req) {
    // req.user is populated by the JwtAuthGuard
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.upsertProfile(req.user.id, updateProfileDto);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
  }))
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
    const fileName = `${randomName}${extname(file.originalname || '.jpg')}`;

    try {
      const publicUrl = await this.storageService.uploadFile(
        'mindnova-assets',
        'avatars',
        fileName,
        file.buffer,
        file.mimetype || 'image/jpeg'
      );

      // Optionally update the profile immediately
      await this.usersService.upsertProfile(req.user.id, { avatarUrl: publicUrl });
      return { avatarUrl: publicUrl };
    } catch (error) {
      throw new BadRequestException(`Avatar upload failed: ${error.message}`);
    }
  }
}
