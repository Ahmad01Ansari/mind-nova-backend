import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { MeditationService } from './meditation.service';
import { 
  StartMeditationSessionDto, 
  CompleteMeditationSessionDto, 
  MeditationHistoryQueryDto 
} from './dto/meditation.dto';

@Controller('meditation')
export class MeditationController {
  constructor(private readonly meditationService: MeditationService) {}

  @Get('dashboard')
  getDashboard() {
    // Hardcoding userId for now as seen in other modules
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.getDashboard(mockUserId);
  }

  @Get('categories')
  getCategories() {
    return this.meditationService.getCategories();
  }

  @Get('catalog')
  getMasterCatalog(@Query() query: any) {
    return this.meditationService.getMasterCatalog(query);
  }

  @Get('recommended')
  getRecommended() {
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.getRecommended(mockUserId);
  }

  @Post('session/start')
  startSession(
    @Body() dto: StartMeditationSessionDto
  ) {
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.startSession(mockUserId, dto);
  }

  @Post('session/complete/:id')
  completeSession(
    @Param('id') contentId: string, 
    @Body() dto: CompleteMeditationSessionDto
  ) {
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.completeSession(mockUserId, contentId, dto);
  }

  @Get('history')
  getHistory(
    @Query() query: MeditationHistoryQueryDto
  ) {
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.getHistory(mockUserId, query);
  }

  @Post('favorite/:id')
  toggleFavorite(
    @Param('id') contentId: string
  ) {
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.toggleFavorite(mockUserId, contentId);
  }

  @Get('favorites')
  getFavorites() {
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.getFavorites(mockUserId);
  }

  @Get('analytics')
  getAnalytics() {
    const mockUserId = "0d3e8e83-2f98-45c7-a03e-d210eec2d954";
    return this.meditationService.getAnalytics(mockUserId);
  }

  @Post('dev/seed')
  seedMockDatabase() {
    return this.meditationService.seedMockDatabase();
  }
}
