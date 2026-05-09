import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SleepService } from './sleep.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateSleepLogDto } from './dto/sleep.dto';
import type { User } from '@prisma/client';

@Controller('sleep')
@UseGuards(AuthGuard('jwt'))
export class SleepController {
  constructor(private sleepService: SleepService) {}

  @Post('log')
  createLog(@GetUser() user: User, @Body() dto: CreateSleepLogDto) {
    return this.sleepService.createOrUpdateLog(user.id, dto);
  }

  @Get('history')
  getHistory(@GetUser() user: User, @Query('days') days?: string) {
    return this.sleepService.getHistory(user.id, days ? parseInt(days) : 7);
  }

  @Get('today')
  getToday(@GetUser() user: User) {
    return this.sleepService.getToday(user.id);
  }

  @Get('summary')
  getSummary(@GetUser() user: User, @Query('days') days?: string) {
    return this.sleepService.getSummary(user.id, days ? parseInt(days) : 7);
  }
}
