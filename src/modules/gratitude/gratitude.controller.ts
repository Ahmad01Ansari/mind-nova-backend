import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { GratitudeService } from './gratitude.service';
import { CreateGratitudeDto, UploadMemoryDto } from './dto/gratitude.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('gratitude')
@UseGuards(AuthGuard('jwt'))
export class GratitudeController {
  constructor(private readonly gratitudeService: GratitudeService) {}

  @Post('create')
  createGratitude(@Req() req, @Body() dto: CreateGratitudeDto) {
    const userId = req.user['sub'] || req.user['id'];
    return this.gratitudeService.createGratitude(userId, dto);
  }

  @Get('history')
  getHistory(
    @Req() req, 
    @Query('skip') skip?: number, 
    @Query('take') take?: number
  ) {
    const userId = req.user['sub'] || req.user['id'];
    return this.gratitudeService.getHistory(userId, Number(skip) || 0, Number(take) || 20);
  }

  @Get('memory-vault')
  getMemoryVault(@Req() req) {
    const userId = req.user['sub'] || req.user['id'];
    return this.gratitudeService.getMemoryVault(userId);
  }

  @Post('upload-memory')
  uploadMemory(@Req() req, @Body() dto: UploadMemoryDto) {
    const userId = req.user['sub'] || req.user['id'];
    return this.gratitudeService.uploadMemory(userId, dto);
  }

  @Post(':id/favorite')
  favoriteEntry(@Req() req, @Param('id') id: string) {
    const userId = req.user['sub'] || req.user['id'];
    return this.gratitudeService.favoriteEntry(userId, id);
  }

  @Get('analytics')
  getAnalytics(@Req() req) {
    const userId = req.user['sub'] || req.user['id'];
    return this.gratitudeService.getAnalytics(userId);
  }

  @Get('categories')
  getCategories(@Req() req) {
    const userId = req.user['sub'] || req.user['id'];
    return this.gratitudeService.getCategories(userId);
  }
}
