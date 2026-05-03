import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { GroundingService } from './grounding.service';
import {
  CreateGroundingSessionDto,
  SubmitCalmRatingDto,
  FavoriteEnvironmentDto,
  GroundingHistoryQueryDto,
} from './dto/grounding.dto';

@Controller('grounding')
export class GroundingController {
  constructor(private readonly groundingService: GroundingService) {}

  private getUserId(req: any): string {
    return req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
  }

  @Get('dashboard')
  getDashboard(@Req() req) {
    return this.groundingService.getDashboard(this.getUserId(req));
  }

  @Post('session')
  logSession(@Req() req, @Body() dto: CreateGroundingSessionDto) {
    return this.groundingService.logSession(this.getUserId(req), dto);
  }

  @Post('calm-rating/:id')
  submitCalmRating(@Req() req, @Param('id') id: string, @Body() dto: SubmitCalmRatingDto) {
    return this.groundingService.submitCalmRating(this.getUserId(req), id, dto);
  }

  @Get('history')
  getHistory(@Req() req, @Query() query: GroundingHistoryQueryDto) {
    return this.groundingService.getHistory(this.getUserId(req), query);
  }

  @Get('analytics')
  getAnalytics(@Req() req) {
    return this.groundingService.getAnalytics(this.getUserId(req));
  }

  @Get('favorites')
  getFavorites(@Req() req) {
    return this.groundingService.getFavorites(this.getUserId(req));
  }

  @Post('favorite-environment')
  saveFavorite(@Req() req, @Body() dto: FavoriteEnvironmentDto) {
    return this.groundingService.saveFavoriteEnvironment(this.getUserId(req), dto);
  }
}
