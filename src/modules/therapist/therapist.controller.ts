import { Controller, Get, Post, Body, Param, Query, Delete, Patch } from '@nestjs/common';
import { TherapistService } from './therapist.service';

@Controller('therapists')
export class TherapistController {
  constructor(private readonly therapistService: TherapistService) {}

  @Get()
  async getAllTherapists() {
    return this.therapistService.getAllTherapists();
  }

  @Get('search')
  async searchTherapists(
    @Query('q') query?: string,
    @Query('specialty') specialty?: string,
    @Query('sort') sort?: string,
  ) {
    return this.therapistService.searchTherapists(query, specialty, sort);
  }

  @Get('featured')
  async getFeaturedTherapists() {
    return this.therapistService.getFeaturedTherapists();
  }

  @Get('pricing')
  async getPricingTiers() {
    return this.therapistService.getPricingTiers();
  }

  @Get(':id')
  async getTherapistById(@Param('id') id: string) {
    return this.therapistService.getTherapistById(id);
  }

  @Get(':id/schedule')
  async getTherapistSchedule(@Param('id') id: string) {
    return this.therapistService.getTherapistSchedule(id);
  }

  @Get(':id/available-slots')
  async getAvailableSlots(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.therapistService.getAvailableSlots(id, date, timezone);
  }

  @Post('match')
  async matchTherapists(@Body() quizData: any) {
    return this.therapistService.matchTherapists(quizData);
  }

  @Post('book')
  async bookSession(@Body() body: { 
    patientId: string; 
    therapistId: string; 
    durationMin: number; 
    type: string; 
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    notes?: string;
    preferredSlot?: string;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    aiSummary?: string; 
  }) {
    // Default to now + durationMin if times are not provided
    const durationMs = (body.durationMin || 45) * 60 * 1000;
    const startTime = body.scheduledStartTime ? new Date(body.scheduledStartTime) : new Date();
    const endTime = body.scheduledEndTime ? new Date(body.scheduledEndTime) : new Date(startTime.getTime() + durationMs);

    return this.therapistService.bookSession(
      body.patientId, 
      body.therapistId, 
      body.durationMin || 45, 
      body.type, 
      startTime,
      endTime,
      body.notes,
      body.preferredSlot,
      body.guestName,
      body.guestPhone,
      body.guestEmail,
      body.aiSummary
    );
  }

  @Post('cancel')
  async cancelSession(@Body() body: { appointmentId: string; cancelledBy: 'USER' | 'THERAPIST' | 'ADMIN' }) {
    return this.therapistService.cancelSession(body.appointmentId, body.cancelledBy);
  }

  @Post('reschedule')
  async rescheduleSession(@Body() body: { appointmentId: string; newStartTime: string; newEndTime: string }) {
    return this.therapistService.rescheduleSession(
      body.appointmentId,
      new Date(body.newStartTime),
      new Date(body.newEndTime)
    );
  }

  @Post('review')
  async submitReview(@Body() body: { userId: string; therapistId: string; rating: number; comment?: string; appointmentId?: string }) {
    return this.therapistService.submitReview(body.userId, body.therapistId, body.rating, body.comment, body.appointmentId);
  }

  @Get('sla/:therapistId')
  async getSlaMetrics(@Param('therapistId') therapistId: string) {
    return this.therapistService.getSlaMetrics(therapistId);
  }

  // ─── AI Assistant Endpoints ────────────────────────────────────────

  @Post('ai/pre-session/:appointmentId')
  async generatePreSessionSummary(@Param('appointmentId') appointmentId: string) {
    return this.therapistService.generatePreSessionSummary(appointmentId);
  }

  @Post('ai/post-session/:appointmentId')
  async generatePostSessionNotes(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { rawNotes: string }
  ) {
    return this.therapistService.generatePostSessionNotes(appointmentId, body.rawNotes);
  }

  // ─── Security & Privacy Endpoints ─────────────────────────────────

  @Delete('thread/:threadId')
  async deleteThread(@Param('threadId') threadId: string) {
    return this.therapistService.deleteThread(threadId);
  }

  @Patch('consent/:appointmentId')
  async updateConsent(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { consent: boolean }
  ) {
    return this.therapistService.updateConsent(appointmentId, body.consent);
  }

  @Post('ask')
  async askQuestion(@Body() body: { patientId: string; therapistId: string; question: string; isAnonymous: boolean }) {
    return this.therapistService.askQuestion(body.patientId, body.therapistId, body.question, body.isAnonymous);
  }

  @Post('waitlist')
  async joinWaitlist(@Body() body: { patientId: string; therapistId: string }) {
    return this.therapistService.joinWaitlist(body.patientId, body.therapistId);
  }

  // ─── Messaging (User-facing) ──────────────────────────────────────

  @Post('message')
  async sendMessage(@Body() body: {
    userId: string;
    therapistId: string;
    content: string;
    category?: string;
    subject?: string;
  }) {
    return this.therapistService.sendMessage(
      body.userId,
      body.therapistId,
      body.content,
      body.category,
      body.subject,
    );
  }

  @Get('messages/:userId')
  async getMessageThreads(@Param('userId') userId: string) {
    return this.therapistService.getMessageThreads(userId);
  }

  @Get('messages/thread/:threadId')
  async getThreadMessages(@Param('threadId') threadId: string) {
    return this.therapistService.getThreadMessages(threadId);
  }

  @Get('my-sessions/:userId')
  async getUserSessions(@Param('userId') userId: string) {
    return this.therapistService.getUserSessions(userId);
  }
}

// ─── Therapist Panel Controller ──────────────────────────────────────

@Controller('therapist-panel')
export class TherapistPanelController {
  constructor(private readonly therapistService: TherapistService) {}

  @Get('pending/:therapistId')
  async getPendingRequests(@Param('therapistId') therapistId: string) {
    return this.therapistService.getPendingRequests(therapistId);
  }

  @Get('active/:therapistId')
  async getActiveBookings(@Param('therapistId') therapistId: string) {
    return this.therapistService.getActiveBookings(therapistId);
  }

  @Get('messages/:therapistId')
  async getPendingMessages(@Param('therapistId') therapistId: string) {
    return this.therapistService.getPendingMessages(therapistId);
  }

  @Get('schedule/:therapistId')
  async getSchedule(@Param('therapistId') therapistId: string) {
    return this.therapistService.getTherapistSchedule(therapistId);
  }

  @Get('profile-by-user/:userId')
  async getProfileByUserId(@Param('userId') userId: string) {
    return this.therapistService.getTherapistProfileByUserId(userId);
  }

  @Post('accept')
  async acceptBooking(@Body() body: { appointmentId: string }) {
    return this.therapistService.acceptBooking(body.appointmentId);
  }

  @Post('decline')
  async declineBooking(@Body() body: { appointmentId: string }) {
    return this.therapistService.declineBooking(body.appointmentId);
  }

  @Post('complete')
  async markSessionComplete(@Body() body: { appointmentId: string }) {
    return this.therapistService.markSessionComplete(body.appointmentId);
  }

  @Post('reply')
  async replyToMessage(@Body() body: { threadId: string; therapistId: string; content: string }) {
    return this.therapistService.replyToMessage(body.threadId, body.therapistId, body.content);
  }

  @Post('update-slots')
  async updateAvailability(@Body() body: {
    therapistId: string;
    slots: { dayOfWeek: string; startTime: string; endTime: string; mode: string }[];
  }) {
    return this.therapistService.updateAvailability(body.therapistId, body.slots);
  }

  @Post('status')
  async updateStatus(@Body() body: { therapistId: string; status: string }) {
    return this.therapistService.updateTherapistStatus(body.therapistId, body.status);
  }
}
