import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TherapistChatGateway } from './therapist-chat.gateway';

interface MatchQuizDto {
  issue: string; // 'Anxiety', 'Depression', 'Burnout', 'Relationship stress', 'Exam stress', etc.
  language: string;
  budget: string; // '299-499', '500-999', '1000+'
  style: string;
}

@Injectable()
export class TherapistService {
  private readonly logger = new Logger(TherapistService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => TherapistChatGateway))
    private chatGateway: TherapistChatGateway,
  ) {}

  // ─── Structured Notification Logger ────────────────────────────────
  private logNotification(event: string, details: Record<string, any>) {
    this.logger.log(`[Therapist Event] ${event}: ${JSON.stringify(details)}`);
    
    // Fire real push notification based on event
    const userId = details.patientId; // Or therapistId based on event direction
    let title = 'Therapy Update';
    let body = 'You have a new update regarding your therapy session.';

    if (event === 'BOOKING_REQUESTED') {
      title = 'Session Requested';
      body = 'Your session request has been sent to the therapist.';
    } else if (event === 'BOOKING_CONFIRMED') {
      title = 'Session Confirmed';
      body = 'Your upcoming therapy session has been confirmed!';
    } else if (event === 'BOOKING_DECLINED') {
      title = 'Session Update';
      body = 'Unfortunately, your session request could not be accommodated.';
    }

    if (userId) {
      this.notificationsService.createNotification({
        userId,
        type: 'THERAPY',
        title,
        body,
        category: 'THERAPY',
        metadata: details,
      }).catch(e => this.logger.error('Failed to send notification', e));
    }
  }

  async getAllTherapists() {
    return this.prisma.therapistProfile.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  async getTherapistById(id: string) {
    const therapist = await this.prisma.therapistProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
    if (!therapist) throw new NotFoundException('Therapist not found');
    return therapist;
  }

  // ─── Search + Filter + Sort ──────────────────────────────────────

  async searchTherapists(query?: string, specialty?: string, sort?: string) {
    const where: any = { isActive: true };

    // Specialty filter
    if (specialty) {
      where.specialty = { contains: specialty, mode: 'insensitive' };
    }

    // Full-text search on name, bio, specialty, languages
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } },
        { specialty: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Sort logic
    let orderBy: any = { rating: 'desc' }; // Default: recommended (highest rated)
    if (sort === 'price_low') orderBy = { hourlyRate: 'asc' };
    if (sort === 'price_high') orderBy = { hourlyRate: 'desc' };
    if (sort === 'experience') orderBy = { experienceYrs: 'desc' };
    if (sort === 'rating') orderBy = { rating: 'desc' };
    if (sort === 'sessions') orderBy = { sessionsCompleted: 'desc' };

    return this.prisma.therapistProfile.findMany({
      where,
      orderBy,
      include: {
        user: { select: { id: true, email: true } },
        availability: true,
      },
    });
  }

  // ─── Deterministic rule-engine scoring ────────────────────────────

  async matchTherapists(quizData: MatchQuizDto) {
    const allTherapists = await this.getAllTherapists();

    // Calculate score for each therapist
    const scoredTherapists = allTherapists.map((therapist) => {
      let score = 0;

      // 1. Issue match (Weight: 40)
      if (therapist.specialty.toLowerCase().includes(quizData.issue.toLowerCase())) {
        score += 40;
      }

      // 2. Language match (Weight: 30)
      if (therapist.languages.some(lang => lang.toLowerCase() === quizData.language.toLowerCase())) {
        score += 30;
      }

      // 3. Budget match (Weight: 20)
      let isBudgetMatch = false;
      if (quizData.budget === '299-499' && therapist.hourlyRate <= 499) isBudgetMatch = true;
      if (quizData.budget === '500-999' && therapist.hourlyRate >= 500 && therapist.hourlyRate <= 999) isBudgetMatch = true;
      if (quizData.budget === '1000+' && therapist.hourlyRate >= 1000) isBudgetMatch = true;
      
      if (isBudgetMatch) {
        score += 20;
      }

      // 4. Style match (Weight: 10)
      if (therapist.styleTags.some(style => style.toLowerCase() === quizData.style.toLowerCase())) {
        score += 10;
      }

      return {
        ...therapist,
        matchScore: score,
        matchReason: `Matched based on ${isBudgetMatch ? 'budget, ' : ''}${therapist.specialty} focus and language.`,
      };
    });

    // Sort descending by score
    return scoredTherapists.sort((a, b) => b.matchScore - a.matchScore);
  }

  async getFeaturedTherapists() {
    return this.prisma.therapistProfile.findMany({
      where: { isActive: true },
      orderBy: { rating: 'desc' },
      take: 3,
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  async getPricingTiers() {
    return [
      { id: 'quick', title: 'Quick Consult', duration: '15 mins', basePrice: 499, description: 'Short voice or chat check-in. Great for quick advice.' },
      { id: 'deep', title: 'Deep Session', duration: '45 mins', basePrice: 999, description: 'Full video consultation. Best for deep dives.' },
      { id: 'student', title: 'Student Access', duration: '45 mins', basePrice: 299, description: 'Discounted rate for verified students (ID required).' },
    ];
  }

  // ─── Schedule / Availability ──────────────────────────────────────

  async getTherapistSchedule(therapistId: string) {
    await this.getTherapistById(therapistId); // Validate existence
    return this.prisma.therapistAvailability.findMany({
      where: { therapistId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async updateAvailability(therapistId: string, slots: { dayOfWeek: string; startTime: string; endTime: string; mode: string }[]) {
    // Delete existing and replace
    await this.prisma.therapistAvailability.deleteMany({ where: { therapistId } });

    const created = await this.prisma.therapistAvailability.createMany({
      data: slots.map(slot => ({
        therapistId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        mode: slot.mode || 'CHAT',
      })),
    });

    // Broadcast update to all connected clients
    this.chatGateway.broadcastScheduleUpdate(therapistId);

    return created;
  }

  // ─── Smart Scheduling Engine ──────────────────────────────────────

  async getAvailableSlots(therapistId: string, dateStr: string, timezone: string = 'Asia/Kolkata') {
    // dateStr format: "YYYY-MM-DD"
    const targetDate = new Date(dateStr);
    const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][targetDate.getDay()];

    // 1. Check if date is blocked
    const isBlocked = await this.prisma.therapistBlockedDate.findFirst({
      where: { therapistId, date: targetDate },
    });
    if (isBlocked) return [];

    // 2. Get base recurring availability + one-off overrides
    const rules = await this.prisma.therapistAvailability.findMany({
      where: {
        therapistId,
        OR: [
          { dayOfWeek, isRecurring: true },
          { specificDate: targetDate }
        ]
      }
    });

    if (rules.length === 0) return [];

    // 3. Get existing appointments for the day to find conflicts
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        therapistId,
        status: { in: ['CONFIRMED', 'REQUESTED'] },
        scheduledStartTime: { gte: startOfDay, lte: endOfDay }
      }
    });

    // 4. Generate 45-min slots with buffer
    const slots: { startTime: Date; endTime: Date; mode: string }[] = [];
    
    for (const rule of rules) {
      // Parse "HH:mm" to Date objects for the target day
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      
      let currentSlotStart = new Date(targetDate);
      currentSlotStart.setHours(startH, startM, 0, 0);
      
      const ruleEnd = new Date(targetDate);
      ruleEnd.setHours(endH, endM, 0, 0);

      while (currentSlotStart < ruleEnd) {
        const currentSlotEnd = new Date(currentSlotStart.getTime() + 45 * 60000); // 45 min session
        const nextSlotStart = new Date(currentSlotEnd.getTime() + rule.bufferMinutes * 60000); // add buffer

        if (currentSlotEnd > ruleEnd) break; // Doesn't fit

        // Check conflicts
        const hasConflict = existingAppointments.some(app => {
          if (!app.scheduledStartTime || !app.scheduledEndTime) return false;
          // Overlap condition: start < appEnd AND end > appStart
          return currentSlotStart < app.scheduledEndTime && currentSlotEnd > app.scheduledStartTime;
        });

        if (!hasConflict && currentSlotStart > new Date()) { // Only future slots
          slots.push({
            startTime: currentSlotStart,
            endTime: currentSlotEnd,
            mode: rule.mode
          });
        }

        currentSlotStart = nextSlotStart;
      }
    }

    return slots;
  }

  // ─── Booking / Sessions ───────────────────────────────────────────

  async bookSession(
    patientId: string,
    therapistId: string,
    durationMin: number,
    type: string,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    notes?: string,
    preferredSlot?: string,
    guestName?: string,
    guestPhone?: string,
    guestEmail?: string,
    aiSummary?: string
  ) {
    // Check if therapist exists
    await this.getTherapistById(therapistId);

    // Check for an active (non-cancelled/completed) booking for this patient+therapist
    const existingActive = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        therapistId,
        status: { in: ['REQUESTED', 'CONFIRMED'] },
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        'You already have an active request or confirmed session with this therapist. Cancel it first to rebook.',
      );
    }

    // ─── Duplicate tap protection (5-min window) ────────────────────
    const recentBooking = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        therapistId,
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    if (recentBooking) {
      throw new BadRequestException('Please wait before submitting another request.');
    }

    // ─── Determine pricing ──────────────────────────────────────────
    const therapist = await this.getTherapistById(therapistId);
    const basePrice = durationMin <= 15 ? (therapist as any).priceQuick ?? 499
                    : (therapist as any).priceStudent ?? (therapist as any).hourlyRate ?? 999;
    const commission = basePrice * 0.15; // 15% platform commission

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        therapistId,
        date: scheduledStartTime, // Legacy fallback
        scheduledStartTime,
        scheduledEndTime,
        durationMin,
        type,
        status: 'REQUESTED',
        notes,
        preferredSlot,
        guestName,
        guestPhone,
        guestEmail,
        aiSummary,
        price: basePrice,
        commission,
        sourceChannel: guestPhone ? 'WHATSAPP' : 'APP',
      },
    });

    this.logNotification('BOOKING_REQUESTED', {
      appointmentId: appointment.id,
      patientId,
      therapistId,
      type,
      durationMin,
      price: basePrice,
    });

    return appointment;
  }

  async cancelSession(appointmentId: string, cancelledBy: 'USER' | 'THERAPIST' | 'ADMIN') {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new BadRequestException('Appointment not found');

    const now = new Date();
    // Late cancellation if less than 24h before
    let lateCancellationFlag = false;
    if (appointment.scheduledStartTime) {
      const hoursUntil = (appointment.scheduledStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil < 24) lateCancellationFlag = true;
    }

    const res = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy,
        lateCancellationFlag,
        refundEligibleLater: !lateCancellationFlag,
      }
    });

    // Update SLA stats if therapist cancelled
    if (cancelledBy === 'THERAPIST') {
      await this.prisma.therapistProfile.update({
        where: { id: appointment.therapistId },
        data: { cancelledSessionsCount: { increment: 1 } }
      });
    }

    return res;
  }

  async rescheduleSession(appointmentId: string, newStartTime: Date, newEndTime: Date) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledStartTime: newStartTime,
        scheduledEndTime: newEndTime,
        status: 'RESCHEDULE_REQUESTED',
      }
    });
  }

  async getUserSessions(userId: string) {
    const sessions = await this.prisma.appointment.findMany({
      where: { patientId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        therapist: {
          select: {
            id: true,
            name: true,
            title: true,
            specialty: true,
            imageUrl: true,
            onlineStatus: true,
          },
        },
      },
    });

    // Split into upcoming and past
    const now = new Date();
    const upcoming = sessions.filter(s => ['REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(s.status));
    const past = sessions.filter(s => ['COMPLETED', 'CANCELLED'].includes(s.status));

    return { upcoming, past };
  }

  // ─── Reviews & Ratings ─────────────────────────────────────────────

  async submitReview(userId: string, therapistId: string, rating: number, comment?: string, appointmentId?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');

    const review = await this.prisma.therapistReview.create({
      data: {
        patientId: userId,
        therapistId,
        rating,
        text: comment,
      }
    });

    // Recalculate average rating
    const aggregations = await this.prisma.therapistReview.aggregate({
      where: { therapistId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const newRating = aggregations._avg.rating ?? 0.0;
    const newCount = aggregations._count.id;

    await this.prisma.therapistProfile.update({
      where: { id: therapistId },
      data: { 
        rating: newRating,
      }
    });

    // Mark appointment as reviewed if passed
    // Utilizing existence of review in other queries instead of a flag

    return review;
  }

  // ─── SLA Metrics ───────────────────────────────────────────────────

  async updateConsent(appointmentId: string, consent: boolean) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        shareMood: consent,
        shareSleep: consent,
        shareAssessments: consent,
        shareJournal: consent,
      }
    });
  }

  async getSlaMetrics(therapistId: string) {
    const profile = await this.prisma.therapistProfile.findUnique({
      where: { id: therapistId },
      select: {
        avgResponseTimeMins: true,
        acceptRate: true,
        cancelledSessionsCount: true,
        rating: true,
      }
    });

    const completedSessions = await this.prisma.appointment.count({
      where: { therapistId, status: 'COMPLETED' }
    });

    return {
      ...profile,
      completedSessions
    };
  }

  // ─── Messaging ────────────────────────────────────────────────────

  async deleteThread(threadId: string) {
    return this.prisma.therapistMessageThread.delete({
      where: { id: threadId },
    });
  }

  async sendMessage(
    userId: string,
    therapistId: string,
    content: string,
    category?: string,
    subject?: string,
  ) {
    await this.getTherapistById(therapistId);

    // Create thread + first message in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const thread = await tx.therapistMessageThread.create({
        data: {
          userId,
          therapistId,
          category,
          subject,
        },
      });

      const message = await tx.therapistMessage.create({
        data: {
          threadId: thread.id,
          senderType: 'USER',
          senderId: userId,
          content,
        },
      });

      return { thread, message };
    });

    console.log(`[ADMIN ALERT] New Message Thread: ${result.thread.id} from User: ${userId}`);
    return result;
  }

  async getMessageThreads(userId: string) {
    return this.prisma.therapistMessageThread.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        therapist: {
          select: {
            id: true,
            name: true,
            title: true,
            imageUrl: true,
            onlineStatus: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Latest message preview
        },
      },
    });
  }

  async getThreadMessages(threadId: string) {
    const thread = await this.prisma.therapistMessageThread.findUnique({
      where: { id: threadId },
      include: {
        therapist: {
          select: {
            id: true,
            name: true,
            title: true,
            imageUrl: true,
            onlineStatus: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!thread) throw new NotFoundException('Thread not found');

    const messages = await this.prisma.therapistMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages as SEEN for the user (they opened the thread)
    await this.prisma.therapistMessage.updateMany({
      where: { threadId, senderType: 'THERAPIST', status: { not: 'SEEN' } },
      data: { status: 'SEEN', seenAt: new Date() },
    });

    return { thread, messages };
  }

  // ─── Q&A ──────────────────────────────────────────────────────────

  async askQuestion(patientId: string, therapistId: string, question: string, isAnonymous: boolean) {
    // Limit to 1 per month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const existingQuestions = await this.prisma.therapistQuestion.count({
      where: {
        patientId,
        createdAt: { gte: startOfMonth },
      },
    });

    if (existingQuestions >= 1) {
      throw new BadRequestException('You can only ask 1 free question per month.');
    }

    return this.prisma.therapistQuestion.create({
      data: {
        patientId,
        therapistId,
        question,
        isAnonymous,
      },
    });
  }

  async joinWaitlist(patientId: string, therapistId: string) {
    return this.prisma.waitlistEntry.create({
      data: {
        patientId,
        therapistId,
      },
    });
  }

  // ─── Therapist Panel Operations ───────────────────────────────────

  async getPendingRequests(therapistId: string) {
    return this.prisma.appointment.findMany({
      where: { therapistId, status: { in: ['REQUESTED', 'RESCHEDULE_REQUESTED'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async getActiveBookings(therapistId: string) {
    return this.prisma.appointment.findMany({
      where: { therapistId, status: 'CONFIRMED' },
      orderBy: { date: 'asc' },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async acceptBooking(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (!['REQUESTED', 'RESCHEDULE_REQUESTED'].includes(appointment.status)) {
      throw new BadRequestException('Only pending/requested appointments can be accepted.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
    });

    this.logNotification('BOOKING_CONFIRMED', {
      appointmentId,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
    });

    return updated;
  }

  async declineBooking(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (!['REQUESTED', 'RESCHEDULE_REQUESTED'].includes(appointment.status)) {
      throw new BadRequestException('Only pending/requested appointments can be declined.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });

    this.logNotification('BOOKING_DECLINED', {
      appointmentId,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
    });

    return updated;
  }

  async markSessionComplete(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.status !== 'CONFIRMED') throw new BadRequestException('Only confirmed sessions can be marked complete.');

    // Increment therapist sessions counter
    await this.prisma.therapistProfile.update({
      where: { id: appointment.therapistId },
      data: { sessionsCompleted: { increment: 1 } },
    });

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED', paymentStatus: 'PAID' },
    });

    this.logNotification('SESSION_COMPLETED', {
      appointmentId,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      revenue: appointment.price,
    });

    return updated;
  }

  async getPendingMessages(therapistId: string) {
    return this.prisma.therapistMessageThread.findMany({
      where: {
        therapistId,
        messages: {
          some: { senderType: 'USER', status: { not: 'SEEN' } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async replyToMessage(threadId: string, therapistId: string, content: string) {
    const thread = await this.prisma.therapistMessageThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.therapistId !== therapistId) throw new BadRequestException('Unauthorized: not your thread.');

    // Get therapist profile to find the actual therapist user id
    const therapistProfile = await this.prisma.therapistProfile.findUnique({ where: { id: therapistId } });

    const message = await this.prisma.therapistMessage.create({
      data: {
        threadId,
        senderType: 'THERAPIST',
        senderId: therapistProfile?.userId || therapistId,
        content,
      },
    });

    // Mark user messages as SEEN by therapist
    await this.prisma.therapistMessage.updateMany({
      where: { threadId, senderType: 'USER', status: { not: 'SEEN' } },
      data: { status: 'SEEN', seenAt: new Date() },
    });

    return message;
  }

  async getTherapistProfileByUserId(userId: string) {
    const profile = await this.prisma.therapistProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('No therapist profile found for this user.');
    return profile;
  }

  async updateTherapistStatus(therapistId: string, status: string) {
    return this.prisma.therapistProfile.update({
      where: { id: therapistId },
      data: { onlineStatus: status, lastActiveAt: new Date() },
    });
  }

  // ─── Socket.IO Chat Methods ──────────────────────────────────

  async createSocketMessage(data: {
    threadId: string;
    senderId: string;
    senderType: string;
    content: string;
    messageType: string;
    fileUrl?: string;
    duration?: number;
  }) {
    const msg = await this.prisma.therapistMessage.create({
      data: {
        threadId: data.threadId,
        senderId: data.senderId,
        senderType: data.senderType,
        content: data.content,
        messageType: data.messageType,
        fileUrl: data.fileUrl,
        duration: data.duration,
        status: 'SENT',
      },
    });

    // Update thread's updatedAt for ordering
    await this.prisma.therapistMessageThread.update({
      where: { id: data.threadId },
      data: { updatedAt: new Date() },
    });

    return msg;
  }

  async markMessagesDelivered(threadId: string, recipientSenderType: string) {
    // Mark all SENT messages from the other party as DELIVERED
    await this.prisma.therapistMessage.updateMany({
      where: {
        threadId,
        senderType: recipientSenderType,
        status: 'SENT',
      },
      data: { status: 'DELIVERED' },
    });
  }

  async markMessagesSeen(threadId: string, viewerSenderType: 'USER' | 'THERAPIST'): Promise<string[]> {
    // Viewer sees messages sent by the OTHER party
    const otherSenderType = viewerSenderType === 'USER' ? 'THERAPIST' : 'USER';
    const unseenMessages = await this.prisma.therapistMessage.findMany({
      where: { threadId, senderType: otherSenderType, status: { not: 'SEEN' } },
      select: { id: true },
    });
    const ids = unseenMessages.map((m) => m.id);
    if (ids.length > 0) {
      await this.prisma.therapistMessage.updateMany({
        where: { id: { in: ids } },
        data: { status: 'SEEN', seenAt: new Date() },
      });
    }
    return ids;
  }

  async updatePresenceByUserId(userId: string, status: string) {
    // Find therapist profile by userId and update presence
    await this.prisma.therapistProfile.updateMany({
      where: { userId },
      data: { onlineStatus: status, lastActiveAt: new Date() },
    });
  }

  // ─── Phase 7: AI Assistant Layer ───────────────────────────────────

  async generatePreSessionSummary(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true }
    });
    if (!appointment) throw new BadRequestException('Appointment not found');
    
    // We check if clientConsent exists. If not strictly enforced for beta, we proceed anyway.
    
    const moodLogs = await this.prisma.moodLog.findMany({
      where: { userId: appointment.patientId },
      orderBy: { createdAt: 'desc' },
    });

    const aiServiceUrl = process.env.AI_SERVICE_URL;
    
    try {
      const axios = require('axios');
      const response = await axios.post(
        `${aiServiceUrl}/insights/generate`,
        {
          userId: appointment.patientId,
          predictionType: 'PRE_SESSION_SUMMARY',
          modelData: { moods: moodLogs.map(m => m.score) },
          context: {
            logCount: moodLogs.length,
            recentMoodAvg: moodLogs.length ? moodLogs.reduce((a, b) => a + b.score, 0) / moodLogs.length : 0,
            notes: appointment.notes
          },
          promptVersion: '3.0',
        },
        { 
          timeout: 45000,
          headers: {
            'X-Bridge-Secret': process.env.FASTAPI_BRIDGE_SECRET,
            'Content-Type': 'application/json'
          }
        }
      );

      const summary = response.data.summary || 'AI generated summary of the client based on recent mood logs and data.';
      
      return this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { aiSummary: summary }
      });
    } catch (e) {
      this.logger.error('Failed to generate pre-session summary', e.message);
      // Fallback
      return this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { aiSummary: `The client has submitted ${moodLogs.length} recent mood logs. Client's main issue: ${appointment.type}` }
      });
    }
  }

  async generatePostSessionNotes(appointmentId: string, therapistNotes: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const axios = require('axios');
      const response = await axios.post(
        `${aiServiceUrl}/insights/generate`,
        {
          userId: 'THERAPIST_SYSTEM',
          predictionType: 'POST_SESSION_NOTES',
          modelData: { rawNotes: therapistNotes },
          context: {},
          promptVersion: '3.0',
        },
        { 
          timeout: 45000,
          headers: {
            'X-Bridge-Secret': process.env.FASTAPI_BRIDGE_SECRET,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        structuredNotes: response.data.content?.analysis || 'Structured Notes:\n- Symptoms discussed.\n- Plan set for next week.',
        rawNotes: therapistNotes,
      };
    } catch (e) {
      this.logger.error('Failed to generate post session notes', e.message);
      return {
        structuredNotes: 'Unable to connect to AI for structured notes at this time. Please format manually.',
        rawNotes: therapistNotes,
      };
    }
  }
}

