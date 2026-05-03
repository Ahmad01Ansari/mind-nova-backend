import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StartFocusSessionDto, EndFocusSessionDto } from './dto/focus.dto';

@Injectable()
export class FocusService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(userId: string, dto: StartFocusSessionDto) {
    return this.prisma.focusSession.create({
      data: {
        userId,
        mode: dto.mode,
        durationMinutes: dto.durationMinutes,
        goal: dto.goal,
        moodBefore: dto.moodBefore,
        selectedAudio: dto.selectedAudio,
        startedAt: new Date(),
      },
    });
  }

  async endSession(userId: string, sessionId: string, dto: EndFocusSessionDto) {
    const session = await this.prisma.focusSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Focus session not found');
    }

    const updatedSession = await this.prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        actualDurationSec: dto.actualDurationSec,
        completed: dto.completedPercent >= 90,
        completedPercent: dto.completedPercent,
        interruptions: dto.interruptions,
        deviceInterrupted: dto.deviceInterrupted,
        moodAfter: dto.moodAfter,
        endedAt: new Date(),
      },
    });

    if (updatedSession.completed) {
      await this.updateStats(userId, Math.floor(dto.actualDurationSec / 60));
    }

    return updatedSession;
  }

  async getStats(userId: string) {
    let stats = await this.prisma.focusStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      stats = await this.prisma.focusStats.create({
        data: { userId },
      });
    }

    const totalHours = Math.floor(stats.totalMinutes / 60);
    const humanMinutes = totalHours > 0 
      ? `You protected ${totalHours} hours of focus.`
      : `You focused for ${stats.totalMinutes} minutes. Keep going!`;

    return {
      totalMinutes: stats.totalMinutes,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      weeklyMinutes: stats.weeklyMinutes,
      humanMinutes,
    };
  }

  private async updateStats(userId: string, minutes: number) {
    const stats = await this.prisma.focusStats.findUnique({ where: { userId } });
    const now = new Date();
    
    let currentStreak = stats?.currentStreak ?? 0;
    let longestStreak = stats?.longestStreak ?? 0;
    
    const lastSession = stats?.lastSessionAt;
    if (lastSession) {
      const lastDate = new Date(lastSession);
      lastDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      } else if (diffDays === 0) {
        // Already logged today, streak stays the same
      }
    } else {
      currentStreak = 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    return this.prisma.focusStats.upsert({
      where: { userId },
      create: {
        userId,
        totalMinutes: minutes,
        currentStreak: 1,
        longestStreak: 1,
        weeklyMinutes: minutes,
        lastSessionAt: now,
      },
      update: {
        totalMinutes: { increment: minutes },
        weeklyMinutes: { increment: minutes },
        currentStreak,
        longestStreak,
        lastSessionAt: now,
      },
    });
  }

  async getHistory(userId: string) {
    return this.prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
  }
}
