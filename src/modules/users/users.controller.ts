import { Controller, Get, Patch, Post, Body, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService, UpdateProfileDto } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    // Optionally update the profile immediately
    await this.usersService.upsertProfile(req.user.id, { avatarUrl });
    return { avatarUrl };
  }
}
