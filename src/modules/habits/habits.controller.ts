import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CreateHabitDto, CompleteHabitDto } from './dto/habits.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('habits')
@UseGuards(AuthGuard('jwt'))
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Post('create')
  createHabit(@Req() req, @Body() dto: CreateHabitDto) {
    const userId = req.user['sub'] || req.user['id'];
    return this.habitsService.createHabit(userId, dto);
  }

  @Get('today')
  getTodayHabits(@Req() req) {
    const userId = req.user['sub'] || req.user['id'];
    return this.habitsService.getTodayHabits(userId);
  }

  @Post('complete')
  completeHabit(@Req() req, @Body() dto: CompleteHabitDto) {
    const userId = req.user['sub'] || req.user['id'];
    return this.habitsService.completeHabit(userId, dto);
  }

  @Get('recommendations')
  getRecommendations(@Req() req, @Query('goal') goal: string) {
    const userId = req.user['sub'] || req.user['id'];
    return this.habitsService.getRecommendations(userId, goal);
  }

  @Get('insights')
  getInsights(@Req() req) {
    const userId = req.user['sub'] || req.user['id'];
    return this.habitsService.getInsights(userId);
  }
}
