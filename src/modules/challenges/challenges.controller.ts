import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChallengesService } from './challenges.service';
import { StartChallengeDto, CompleteDayDto, AbandonChallengeDto } from './dto/challenges.dto';

@Controller('challenges')
@UseGuards(AuthGuard('jwt'))
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  getAll() {
    return this.challengesService.getAll();
  }

  @Get('active')
  getActive(@Req() req) {
    const userId = req.user['sub'] || req.user['id'];
    return this.challengesService.getActive(userId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.challengesService.getById(id);
  }

  @Post('start')
  start(@Req() req, @Body() dto: StartChallengeDto) {
    const userId = req.user['sub'] || req.user['id'];
    return this.challengesService.startChallenge(userId, dto);
  }

  @Post('complete-day')
  completeDay(@Req() req, @Body() dto: CompleteDayDto) {
    const userId = req.user['sub'] || req.user['id'];
    return this.challengesService.completeDay(userId, dto);
  }

  @Post('abandon')
  abandon(@Req() req, @Body() dto: AbandonChallengeDto) {
    const userId = req.user['sub'] || req.user['id'];
    return this.challengesService.abandonChallenge(userId, dto);
  }
}
