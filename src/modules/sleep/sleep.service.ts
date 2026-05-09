import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSleepLogDto } from './dto/sleep.dto';

@Injectable()
export class SleepService {
  private readonly logger = new Logger(SleepService.name);

  constructor(private prisma: PrismaService) {}

  async createOrUpdateLog(userId: string, dto: CreateSleepLogDto) {
    const date = new Date(dto.date);
    // Reset to midnight for date-only comparison
    date.setUTCHours(0, 0, 0, 0);

    const log = await this.prisma.sleepLog.upsert({
      where: {
        userId_date: { userId, date },
      },
      update: {
        bedtime: dto.bedtime,
        wakeTime: dto.wakeTime,
        durationHours: dto.durationHours,
        quality: dto.quality,
        awakenings: dto.awakenings ?? 0,
        stressBefore: dto.stressBefore,
        morningMood: dto.morningMood,
      },
      create: {
        userId,
        date,
        bedtime: dto.bedtime,
        wakeTime: dto.wakeTime,
        durationHours: dto.durationHours,
        quality: dto.quality,
        awakenings: dto.awakenings ?? 0,
        stressBefore: dto.stressBefore,
        morningMood: dto.morningMood,
      },
    });

    this.logger.log(`Sleep log saved for user ${userId} on ${date.toISOString().split('T')[0]}`);
    return log;
  }

  async getHistory(userId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    return this.prisma.sleepLog.findMany({
      where: {
        userId,
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getToday(userId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prisma.sleepLog.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });
  }

  async getSummary(userId: string, days: number = 7) {
    const logs = await this.getHistory(userId, days);

    if (logs.length === 0) {
      return {
        averageHours: 0,
        averageQuality: 0,
        totalLogs: 0,
        trend: 0,
        badge: 'No data',
      };
    }

    const avgHours = logs.reduce((sum, l) => sum + l.durationHours, 0) / logs.length;
    const avgQuality = logs.reduce((sum, l) => sum + l.quality, 0) / logs.length;

    // Calculate trend: compare recent half vs older half
    let trend = 0;
    if (logs.length >= 2) {
      const mid = Math.floor(logs.length / 2);
      const recentAvg = logs.slice(0, mid).reduce((s, l) => s + l.durationHours, 0) / mid;
      const olderAvg = logs.slice(mid).reduce((s, l) => s + l.durationHours, 0) / (logs.length - mid);
      trend = parseFloat((recentAvg - olderAvg).toFixed(1));
    }

    // Badge logic
    let badge = 'Fair';
    if (avgHours >= 7 && avgQuality >= 3.5) badge = 'Rested';
    else if (avgHours >= 6 && avgQuality >= 2.5) badge = 'Okay';
    else if (avgHours < 5) badge = 'Sleep Deprived';

    return {
      averageHours: parseFloat(avgHours.toFixed(1)),
      averageQuality: parseFloat(avgQuality.toFixed(1)),
      totalLogs: logs.length,
      trend,
      badge,
    };
  }
}
