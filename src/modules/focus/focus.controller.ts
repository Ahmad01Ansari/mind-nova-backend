import { Controller, Post, Get, Body, UseGuards, Param, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FocusService } from './focus.service';
import { StartFocusSessionDto, EndFocusSessionDto } from './dto/focus.dto';

@Controller('focus')
@UseGuards(AuthGuard('jwt'))
export class FocusController {
  constructor(private readonly focusService: FocusService) {}

  @Post('start')
  startSession(@Req() req, @Body() dto: StartFocusSessionDto) {
    const userId = req.user?.id || '0d3e8e83-2f98-45c7-a03e-d210eec2d954';
    return this.focusService.startSession(userId, dto);
  }

  @Post('end/:id')
  endSession(
    @Req() req,
    @Param('id') sessionId: string,
    @Body() dto: EndFocusSessionDto,
  ) {
    const userId = req.user?.id || '0d3e8e83-2f98-45c7-a03e-d210eec2d954';
    return this.focusService.endSession(userId, sessionId, dto);
  }

  @Get('stats')
  getStats(@Req() req) {
    const userId = req.user?.id || '0d3e8e83-2f98-45c7-a03e-d210eec2d954';
    return this.focusService.getStats(userId);
  }

  @Get('history')
  getHistory(@Req() req) {
    const userId = req.user?.id || '0d3e8e83-2f98-45c7-a03e-d210eec2d954';
    return this.focusService.getHistory(userId);
  }
}
