import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioQueryDto, CreateAudioTrackDto, MarkPlayedDto, RegisterDownloadDto } from './dto/audio.dto';

const MOCK_USER_ID = 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get('categories')
  getCategories() {
    return this.audioService.getCategories();
  }

  @Get('tracks')
  getTracks(@Query() query: AudioQueryDto) {
    return this.audioService.getTracks(query);
  }

  @Get('categories/:category/tracks')
  getTracksByCategory(@Param('category') category: string, @Query() query: AudioQueryDto) {
    return this.audioService.getTracks({ ...query, category: category as any });
  }

  @Get('subcategory/:subcategory/tracks')
  getTracksBySubCategory(@Param('subcategory') subCategory: string, @Query() query: AudioQueryDto) {
    return this.audioService.getTracks({ ...query, subCategory });
  }

  @Get('recommended')
  getRecommended() {
    return this.audioService.getRecommended(MOCK_USER_ID);
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    return this.audioService.getHistory(MOCK_USER_ID, limit ? parseInt(limit, 10) : 20);
  }

  @Get('favorites')
  getFavorites() {
    return this.audioService.getFavorites(MOCK_USER_ID);
  }

  @Get('downloads')
  getDownloads() {
    return this.audioService.getDownloads(MOCK_USER_ID);
  }

  @Get('tracks/:id')
  getTrack(@Param('id') id: string) {
    return this.audioService.getTrack(id);
  }

  @Post('create')
  createTrack(@Body() dto: CreateAudioTrackDto) {
    return this.audioService.createTrack(dto);
  }

  @Post('play/:id')
  markPlayed(@Param('id') id: string, @Body() dto: MarkPlayedDto) {
    return this.audioService.markPlayed(MOCK_USER_ID, id, dto);
  }

  @Post('favorite/:id')
  toggleFavorite(@Param('id') id: string) {
    return this.audioService.toggleFavorite(MOCK_USER_ID, id);
  }

  @Post('download/:id')
  registerDownload(@Param('id') id: string, @Body() dto: RegisterDownloadDto) {
    return this.audioService.registerDownload(MOCK_USER_ID, id, dto);
  }

  @Post('dev/seed')
  seed() {
    return this.audioService.seedMockDatabase();
  }

  @Get('bucket/:bucket/folders')
  getFoldersByBucket(@Param('bucket') bucket: string) {
    return this.audioService.getFoldersByBucket(bucket);
  }

  @Get('folder/:folder/files')
  getFilesInFolder(@Query('bucket') bucket: string, @Param('folder') folder: string) {
    return this.audioService.getFilesInFolder(bucket || 'sleep-sounds', folder);
  }

  @Post('bucket/:bucket/seed')
  seedBucketMetadata(@Param('bucket') bucket: string) {
    return this.audioService.seedBucketMetadata(bucket);
  }
}
