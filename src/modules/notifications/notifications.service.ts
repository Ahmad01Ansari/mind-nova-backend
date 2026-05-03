import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Initialize Firebase Admin if not already initialized
    if (admin.apps.length === 0) {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS
        });
        this.logger.log('Firebase Admin initialized for FCM.');
      } catch (e) {
        this.logger.error('Failed to initialize Firebase Admin', e);
      }
    }
  }

  // ══════════════════════════════════════════════════
  //  NOTIFICATIONS CRUD
  // ══════════════════════════════════════════════════

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, deletedAt: null, readAt: null },
    });

    return { notifications, total, unreadCount, page, limit };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });
  }

  async deleteNotification(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { deletedAt: new Date() },
    });
  }

  // ══════════════════════════════════════════════════
  //  CREATE NOTIFICATION (Internal use by jobs)
  // ══════════════════════════════════════════════════

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    category: string;
    priority?: string;
    channel?: string;
    deepLink?: string;
    metadata?: any;
    scheduledAt?: Date;
    expiresAt?: Date;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        category: data.category,
        priority: data.priority || 'MEDIUM',
        channel: data.channel || 'PUSH',
        deepLink: data.deepLink,
        metadata: data.metadata,
        scheduledAt: data.scheduledAt || new Date(),
        expiresAt: data.expiresAt,
      },
    });

    if (notification.channel === 'PUSH') {
      const isDue = !data.scheduledAt || data.scheduledAt <= new Date();
      if (isDue) {
        await this.sendPushNotification(data.userId, data.title, data.body, data.metadata);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() }
        });
      }
    }

    return notification;
  }

  // ══════════════════════════════════════════════════
  //  FCM PUSH NOTIFICATIONS
  // ══════════════════════════════════════════════════

  async sendPushNotification(userId: string, title: string, body: string, dataPayload?: any) {
    try {
      const activeTokens = await this.getActiveTokens(userId);
      if (activeTokens.length === 0) return;

      const tokens = activeTokens.map(t => t.token);
      const payload: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: dataPayload ? { ...dataPayload } : undefined,
        android: { priority: 'high' },
        apns: { payload: { aps: { contentAvailable: true } } },
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      if (response.failureCount > 0) {
        this.logger.warn(`Failed to send ${response.failureCount} push notifications.`);
        // Note: Clean up invalid tokens based on response.responses if needed
      }
    } catch (e) {
      this.logger.error('Error sending push notification', e);
    }
  }

  // ══════════════════════════════════════════════════
  //  DEVICE TOKENS
  // ══════════════════════════════════════════════════

  async registerDeviceToken(userId: string, token: string, platform: string) {
    // Upsert: if token exists, update owner and mark active
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, isActive: true },
      create: { userId, token, platform },
    });
  }

  async unregisterDeviceToken(token: string) {
    return this.prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  async getActiveTokens(userId: string) {
    return this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });
  }

  // ══════════════════════════════════════════════════
  //  NOTIFICATION PREFERENCES
  // ══════════════════════════════════════════════════

  async getPreferences(userId: string) {
    // Create default preferences if none exist
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updatePreferences(userId: string, data: Record<string, any>) {
    // Filter only allowed fields to prevent injection
    const allowedFields = [
      'moodReminders', 'sleepReminders', 'assessmentReminders',
      'weeklyReportAlerts', 'streakAlerts', 'therapyReminders',
      'meditationReminders', 'journalReminders', 'communityAlerts',
      'marketingAlerts', 'quietHoursStart', 'quietHoursEnd',
      'timezone', 'moodReminderTime', 'sleepReminderTime',
    ];

    const filtered: Record<string, any> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        filtered[key] = data[key];
      }
    }

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: filtered,
      create: { userId, ...filtered },
    });
  }

  // ══════════════════════════════════════════════════
  //  REMINDER SCHEDULES
  // ══════════════════════════════════════════════════

  async getReminders(userId: string) {
    return this.prisma.reminderSchedule.findMany({
      where: { userId },
      orderBy: { reminderType: 'asc' },
    });
  }

  async updateReminder(userId: string, reminderType: string, data: {
    scheduledTime?: string;
    daysOfWeek?: string[];
    isActive?: boolean;
  }) {
    return this.prisma.reminderSchedule.upsert({
      where: { userId_reminderType: { userId, reminderType } },
      update: data,
      create: {
        userId,
        reminderType,
        scheduledTime: data.scheduledTime || '20:00',
        daysOfWeek: data.daysOfWeek || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        isActive: data.isActive ?? true,
      },
    });
  }

  async snoozeReminder(userId: string, reminderType: string, minutes: number) {
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
    return this.prisma.reminderSchedule.updateMany({
      where: { userId, reminderType },
      data: { snoozedUntil },
    });
  }
}
