import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ══════════════════════════════════════════════════
  //  Daily Reminder Generator — runs at 2:00 AM
  // ══════════════════════════════════════════════════
  @Cron('0 2 * * *')
  async generateDailyReminders() {
    this.logger.log('⏰ Running daily reminder generation...');

    try {
      // Get all users with active preferences
      const preferences = await this.prisma.notificationPreference.findMany({
        include: { user: true },
      });

      let createdCount = 0;

      for (const pref of preferences) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // ── Mood Reminders ──
        if (pref.moodReminders) {
          const [hours, minutes] = pref.moodReminderTime.split(':').map(Number);
          const scheduledAt = new Date(`${today}T${pref.moodReminderTime}:00`);

          // Check if mood was already logged today
          const moodToday = await this.prisma.moodLog.count({
            where: {
              userId: pref.userId,
              createdAt: { gte: new Date(`${today}T00:00:00`) },
            },
          });

          if (moodToday === 0) {
            // Check no existing reminder for today
            const existingReminder = await this.prisma.notification.count({
              where: {
                userId: pref.userId,
                type: 'MOOD_REMINDER',
                scheduledAt: { gte: new Date(`${today}T00:00:00`) },
                deletedAt: null,
              },
            });

            if (existingReminder === 0) {
              await this.notificationsService.createNotification({
                userId: pref.userId,
                type: 'MOOD_REMINDER',
                title: 'How are you feeling? 🌤️',
                body: 'Take 30 seconds to log your mood and keep your streak alive.',
                category: 'MOOD',
                priority: 'HIGH',
                deepLink: '/mood-checkin',
                scheduledAt,
                expiresAt: new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000),
              });
              createdCount++;
            }
          }
        }

        // ── Sleep Reminders ──
        if (pref.sleepReminders) {
          const scheduledAt = new Date(`${today}T${pref.sleepReminderTime}:00`);

          const existingReminder = await this.prisma.notification.count({
            where: {
              userId: pref.userId,
              type: 'SLEEP_REMINDER',
              scheduledAt: { gte: new Date(`${today}T00:00:00`) },
              deletedAt: null,
            },
          });

          if (existingReminder === 0) {
            await this.notificationsService.createNotification({
              userId: pref.userId,
              type: 'SLEEP_REMINDER',
              title: 'Wind down time 🌙',
              body: 'Your ideal bedtime is approaching. Start winding down for better sleep.',
              category: 'SLEEP',
              priority: 'MEDIUM',
              deepLink: '/mood-checkin',
              scheduledAt,
              expiresAt: new Date(scheduledAt.getTime() + 12 * 60 * 60 * 1000),
            });
            createdCount++;
          }
        }

        // ── Assessment Reminders (check bi-weekly) ──
        if (pref.assessmentReminders) {
          const lastAssessment = await this.prisma.assessmentScore.findFirst({
            where: { userId: pref.userId },
            orderBy: { createdAt: 'desc' },
          });

          const daysSinceLastAssessment = lastAssessment
            ? Math.floor((Date.now() - lastAssessment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          if (daysSinceLastAssessment >= 14) {
            const existingReminder = await this.prisma.notification.count({
              where: {
                userId: pref.userId,
                type: 'ASSESSMENT_REMINDER',
                scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                deletedAt: null,
              },
            });

            if (existingReminder === 0) {
              await this.notificationsService.createNotification({
                userId: pref.userId,
                type: 'ASSESSMENT_REMINDER',
                title: 'Time for a check-in 📋',
                body: `It's been ${daysSinceLastAssessment} days since your last assessment. Track your progress with a quick 3-minute check-in.`,
                category: 'ASSESSMENT',
                priority: 'MEDIUM',
                deepLink: '/assessment/phq9',
                scheduledAt: new Date(`${today}T10:00:00`),
              });
              createdCount++;
            }
          }
        }
      }

      this.logger.log(`✅ Created ${createdCount} daily reminders.`);
    } catch (error) {
      this.logger.error('❌ Failed to generate daily reminders:', error);
    }
  }

  // ══════════════════════════════════════════════════
  //  Cleanup Expired Notifications — runs at 4:00 AM
  // ══════════════════════════════════════════════════
  @Cron('0 4 * * *')
  async cleanupExpiredNotifications() {
    this.logger.log('🧹 Cleaning up expired notifications...');
    try {
      const result = await this.prisma.notification.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          readAt: null,
        },
      });
      this.logger.log(`✅ Cleaned up ${result.count} expired notifications.`);
    } catch (error) {
      this.logger.error('❌ Failed to clean up expired notifications:', error);
    }
  }

  // ══════════════════════════════════════════════════
  //  Weekly Report Ready — runs every Sunday at 8 PM
  // ══════════════════════════════════════════════════
  @Cron('0 20 * * 0')
  async sendWeeklyReportNotifications() {
    this.logger.log('📊 Sending weekly report notifications...');
    try {
      const preferences = await this.prisma.notificationPreference.findMany({
        where: { weeklyReportAlerts: true },
      });

      let count = 0;
      for (const pref of preferences) {
        // Check if a report exists for this week
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const report = await this.prisma.weeklyReport.findFirst({
          where: {
            userId: pref.userId,
            createdAt: { gte: oneWeekAgo },
          },
        });

        if (report) {
          await this.notificationsService.createNotification({
            userId: pref.userId,
            type: 'WEEKLY_REPORT',
            title: 'Your Weekly AI Insights are ready! 🌟',
            body: 'Discover patterns, trends, and personalized recommendations from this week.',
            category: 'REPORT',
            priority: 'HIGH',
            deepLink: '/weekly-insight',
            scheduledAt: new Date(),
          });
          count++;
        }
      }

      this.logger.log(`✅ Sent ${count} weekly report notifications.`);
    } catch (error) {
      this.logger.error('❌ Failed to send weekly report notifications:', error);
    }
  }

  // ══════════════════════════════════════════════════
  //  Streak Check — runs daily at 9 PM
  // ══════════════════════════════════════════════════
  @Cron('0 21 * * *')
  async sendStreakNotifications() {
    this.logger.log('🔥 Checking mood streaks...');
    try {
      const streaks = await this.prisma.moodStreak.findMany({
        where: {
          currentStreak: { in: [3, 7, 14, 30, 60, 100] },
        },
        include: { user: true },
      });

      for (const streak of streaks) {
        await this.notificationsService.createNotification({
          userId: streak.userId,
          type: 'STREAK_MILESTONE',
          title: `🔥 ${streak.currentStreak}-day streak!`,
          body: `You've logged your mood for ${streak.currentStreak} days in a row. Keep the momentum going!`,
          category: 'MOOD',
          priority: 'LOW',
          deepLink: '/',
          scheduledAt: new Date(),
        });
      }

      this.logger.log(`✅ Sent ${streaks.length} streak milestone notifications.`);
    } catch (error) {
      this.logger.error('❌ Failed to send streak notifications:', error);
    }
  }

  // ══════════════════════════════════════════════════
  //  Process Scheduled Notifications — runs every minute
  // ══════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    try {
      const pendingNotifications = await this.prisma.notification.findMany({
        where: {
          channel: 'PUSH',
          sentAt: null,
          deletedAt: null,
          scheduledAt: { lte: new Date() },
        },
      });

      if (pendingNotifications.length > 0) {
        this.logger.log(`🚀 Processing ${pendingNotifications.length} scheduled push notifications...`);
        for (const notif of pendingNotifications) {
          await this.notificationsService.sendPushNotification(
            notif.userId,
            notif.title,
            notif.body,
            notif.metadata
          );

          await this.prisma.notification.update({
            where: { id: notif.id },
            data: { sentAt: new Date() },
          });
        }
        this.logger.log(`✅ Successfully sent ${pendingNotifications.length} scheduled push notifications.`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to process scheduled notifications:', error);
    }
  }
}
