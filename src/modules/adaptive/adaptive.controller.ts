import { Controller, Post, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdaptiveService } from './adaptive.service';
import { StartAdaptiveDto } from './dto/start-adaptive.dto';
import { AnswerAdaptiveDto } from './dto/answer-adaptive.dto';

@Controller('adaptive')
@UseGuards(AuthGuard('jwt'))
export class AdaptiveController {
  constructor(private readonly adaptiveService: AdaptiveService) {}

  @Post('start')
  async startSession(@Body() dto: StartAdaptiveDto, @Req() req: any) {
    const userId = req.user.id;
    return this.adaptiveService.startSession(userId, dto);
  }

  @Patch('answer')
  async submitAnswer(@Body() dto: AnswerAdaptiveDto, @Req() req: any) {
    const userId = req.user.id;
    return this.adaptiveService.submitAnswer(userId, dto);
  }
}
