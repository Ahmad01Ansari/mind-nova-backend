import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssessmentService } from './assessment.service';
import { SubmitAssessmentDto, SaveProgressDto } from './dto/assessment.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('assessments')
@UseGuards(AuthGuard('jwt'))
export class AssessmentController {
  constructor(private assessmentService: AssessmentService) {}

  @Get()
  findAll() {
    return this.assessmentService.findAll();
  }

  @Get('history')
  getHistory(@GetUser() user: User) {
    return this.assessmentService.getHistory(user.id);
  }

  // --- Session Management ---

  @Get('sessions')
  getAllSessions(@GetUser() user: User) {
    return this.assessmentService.getAllSessions(user.id);
  }

  @Get('sessions/:id')
  getSession(@GetUser() user: User, @Param('id') id: string) {
    return this.assessmentService.getSession(user.id, id);
  }

  @Post('sessions/:id/start')
  startSession(
    @GetUser() user: User, 
    @Param('id') id: string, 
    @Query('depth') depth: string
  ) {
    return this.assessmentService.startSession(user.id, id, depth);
  }

  @Patch('sessions/:id/progress')
  saveProgress(
    @GetUser() user: User, 
    @Param('id') id: string, 
    @Body() dto: SaveProgressDto
  ) {
    return this.assessmentService.saveProgress(user.id, id, dto);
  }

  // --- Core Lifecycle ---

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentService.findOne(id);
  }

  @Post(':id/submit')
  submit(@GetUser() user: User, @Param('id') id: string, @Body() dto: SubmitAssessmentDto) {
    return this.assessmentService.submitAnswers(user.id, id, dto);
  }
}
