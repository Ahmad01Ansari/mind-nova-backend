import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TherapistReminderService {
  private readonly logger = new Logger(TherapistReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingAppointments() {
    const now = new Date();
    
    // Check appointments within the next 24h + 1m
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        scheduledStartTime: {
          gt: now,
          lte: horizon,
        },
      },
      include: {
        patient: true, 
        therapist: true,
      }
    });

    for (const app of appointments) {
      if (!app.scheduledStartTime) continue;

      const msUntil = app.scheduledStartTime.getTime() - now.getTime();
      const minutesUntil = Math.floor(msUntil / 60000);

      let title = '';
      let body = '';

      if (minutesUntil === 24 * 60) {
        title = 'Session Tomorrow';
        body = `Your session with ${app.therapist?.name ?? 'your therapist'} is in 24 hours.`;
      } else if (minutesUntil === 60) {
        title = 'Session in 1 Hour';
        body = `Your session is coming up in 1 hour. Get ready!`;
      } else if (minutesUntil === 10) {
        title = 'Session Starting Soon';
        body = `Your session starts in 10 minutes. The waiting room is open.`;
      }

      if (title !== '') {
        this.logger.log(`[Reminder ${minutesUntil}m] Appt ${app.id}`);
        this.notificationsService.createNotification({
          userId: app.patientId,
          type: 'THERAPY_REMINDER',
          title,
          body,
          category: 'THERAPY',
          metadata: { appointmentId: app.id },
        }).catch(e => this.logger.error('Failed to send reminder', e));
      }
    }
  }
}
