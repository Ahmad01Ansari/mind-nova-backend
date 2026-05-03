import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WeeklyReportsService } from './weekly-reports.service';

@Injectable()
export class ReportsScheduler {
  private readonly logger = new Logger(ReportsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private weeklyReportsService: WeeklyReportsService,
  ) {}

  /**
   * Runs every hour. Checks which users' local timezone = Sunday 8 PM.
   * This enables timezone-aware report delivery instead of a single global cron.
   */
  @Cron('0 * * * *') // Every hour on the hour
  async dispatchWeeklyReports() {
    const now = new Date();
    const currentUtcHour = now.getUTCHours();
    const currentUtcDay = now.getUTCDay(); // 0 = Sunday

    // Build the set of timezones where it is currently Sunday 8 PM (20:00)
    // We check which UTC offsets would make local time = Sunday 20:00
    const targetTimezones = this.getTimezonesForLocalTime(currentUtcDay, currentUtcHour, 0, 20); // target: Sunday 20:00

    if (targetTimezones.length === 0) return;

    this.logger.log(`Checking for users in timezones where it's Sunday 8 PM: [${targetTimezones.join(', ')}]`);

    // Find users whose NotificationPreference.timezone matches
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsers = await this.prisma.user.findMany({
      where: {
        notificationPref: {
          timezone: { in: targetTimezones },
          weeklyReportAlerts: true,
        },
        OR: [
          { moodLogs: { some: { createdAt: { gte: sevenDaysAgo } } } },
          { gratitudeEntries: { some: { createdAt: { gte: sevenDaysAgo } } } },
          { journalEntries: { some: { createdAt: { gte: sevenDaysAgo } } } },
          { meditationSessions: { some: { completedAt: { gte: sevenDaysAgo } } } },
          { groundingSessions: { some: { completedAt: { gte: sevenDaysAgo } } } },
        ],
      },
      select: { id: true },
    });

    this.logger.log(`Found ${activeUsers.length} active users for weekly report dispatch.`);

    for (const user of activeUsers) {
      try {
        await this.weeklyReportsService.generateForUser(user.id);
      } catch (error: any) {
        this.logger.error(`Failed to generate report for ${user.id}: ${error.message}`);
      }
    }
  }

  /**
   * Manual trigger for testing — called from the controller (authenticated).
   */
  async triggerManualDispatch(userId: string) {
    return this.weeklyReportsService.generateForUser(userId);
  }

  /**
   * Given the current UTC day/hour, returns common timezone strings
   * where the local time would be the target day/hour.
   */
  private getTimezonesForLocalTime(
    utcDay: number, utcHour: number, utcMinute: number,
    targetHour: number,
  ): string[] {
    // Calculate offset needed: localHour = utcHour + offset => offset = targetHour - utcHour
    const offset = targetHour - utcHour;

    // Map common offsets to timezone names that Prisma stores
    const timezoneMap: Record<number, string[]> = {
      '-12': ['Etc/GMT+12'],
      '-11': ['Pacific/Midway'],
      '-10': ['Pacific/Honolulu'],
      '-9': ['America/Anchorage'],
      '-8': ['America/Los_Angeles', 'US/Pacific'],
      '-7': ['America/Denver', 'US/Mountain'],
      '-6': ['America/Chicago', 'US/Central'],
      '-5': ['America/New_York', 'US/Eastern'],
      '-4': ['America/Halifax', 'America/Caracas'],
      '-3': ['America/Sao_Paulo', 'America/Argentina/Buenos_Aires'],
      '-2': ['Atlantic/South_Georgia'],
      '-1': ['Atlantic/Azores'],
      '0': ['UTC', 'Europe/London', 'Etc/GMT'],
      '1': ['Europe/Paris', 'Europe/Berlin', 'Africa/Lagos'],
      '2': ['Europe/Istanbul', 'Africa/Cairo', 'Asia/Jerusalem'],
      '3': ['Europe/Moscow', 'Asia/Riyadh'],
      '3.5': ['Asia/Tehran'],
      '4': ['Asia/Dubai', 'Asia/Muscat'],
      '5': ['Asia/Karachi', 'Asia/Tashkent'],
      '5.5': ['Asia/Kolkata', 'Asia/Calcutta', 'Asia/Colombo'],
      '6': ['Asia/Dhaka', 'Asia/Almaty'],
      '7': ['Asia/Bangkok', 'Asia/Jakarta'],
      '8': ['Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong'],
      '9': ['Asia/Tokyo', 'Asia/Seoul'],
      '9.5': ['Australia/Darwin', 'Australia/Adelaide'],
      '10': ['Australia/Sydney', 'Pacific/Guam'],
      '11': ['Pacific/Noumea'],
      '12': ['Pacific/Auckland', 'Pacific/Fiji'],
    };

    // Normalize offset to handle wrap-around
    let normalizedOffset = offset;
    if (normalizedOffset > 12) normalizedOffset -= 24;
    if (normalizedOffset < -12) normalizedOffset += 24;

    // Also need to check if the day would be Sunday at the target timezone
    // If offset pushes us to a different day, skip
    const localDay = (utcDay + Math.floor((utcHour + normalizedOffset) / 24) + 7) % 7;
    if (localDay !== 0) return []; // Not Sunday in this timezone

    return timezoneMap[normalizedOffset.toString()] || [];
  }
}
