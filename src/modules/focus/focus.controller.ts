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
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.focusService.startSession(userId, dto);
  }

  @Post('end/:id')
  endSession(
    @Req() req,
    @Param('id') sessionId: string,
    @Body() dto: EndFocusSessionDto,
  ) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.focusService.endSession(userId, sessionId, dto);
  }

  @Get('stats')
  getStats(@Req() req) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.focusService.getStats(userId);
  }

  @Get('history')
  getHistory(@Req() req) {
    const userId = req.user?.id || 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76';
    return this.focusService.getHistory(userId);
  }
}
