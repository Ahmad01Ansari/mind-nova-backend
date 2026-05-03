import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecoveryService } from './recovery.service';
import { StartRecoveryDto, CompleteRecoveryDto } from './dto/recovery.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('recovery')
@UseGuards(AuthGuard('jwt'))
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get('sessions')
  getSessions(@Query('category') category?: string) {
    return this.recoveryService.getSessions(category);
  }

  @Post('start')
  startSession(@GetUser() user: User, @Body() dto: StartRecoveryDto) {
    return this.recoveryService.startSession(user.id, dto);
  }

  @Post('complete')
  completeSession(@GetUser() user: User, @Body() dto: CompleteRecoveryDto) {
    return this.recoveryService.completeSession(user.id, dto);
  }

  @Get('score')
  getScore(@GetUser() user: User) {
    return this.recoveryService.getScore(user.id);
  }

  @Get('recommendation')
  getRecommendation(@GetUser() user: User, @Query('category') category?: string) {
    return this.recoveryService.getRecommendation(user.id, category);
  }

  @Get('history')
  getHistory(@GetUser() user: User) {
    return this.recoveryService.getHistory(user.id);
  }

  @Get('insights')
  getInsights(@GetUser() user: User) {
    return this.recoveryService.getInsights(user.id);
  }

  @Post('feedback')
  recordFeedback(
    @GetUser() user: User,
    @Body('stageType') stageType: string,
    @Body('isPositive') isPositive: boolean,
  ) {
    return this.recoveryService.recordFeedback(user.id, stageType, isPositive);
  }
}
