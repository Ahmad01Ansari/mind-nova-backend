import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateHabitDto, CompleteHabitDto } from './dto/habits.dto';

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  async createHabit(userId: string, dto: CreateHabitDto) {
    const habit = await this.prisma.habit.create({
      data: {
        userId,
        ...dto,
      },
    });

    // Initialize streak
    await this.prisma.habitStreak.create({
      data: {
        userId,
        habitId: habit.id,
        currentStreak: 0,
        consistencyScore: 0,
      },
    });

    return habit;
  }

  async getTodayHabits(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Proactively check for missed days
    await this.checkMissedDays(userId);

    return this.prisma.habit.findMany({
      where: { userId, isActive: true },
      include: {
        logs: {
          where: {
            completedAt: {
              gte: today,
            },
          },
        },
        streak: true,
        recoveryState: true,
      },
    });
  }

  async completeHabit(userId: string, dto: CompleteHabitDto) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: dto.habitId },
      include: { streak: true },
    });

    if (!habit || habit.userId !== userId) {
      throw new NotFoundException('Habit not found');
    }

    // Create log
    const log = await this.prisma.habitLog.create({
      data: {
        userId,
        habitId: dto.habitId,
        moodBefore: dto.moodBefore,
        moodAfter: dto.moodAfter,
        note: dto.note,
        duration: dto.actualDuration,
      },
    });

    // Update streak and consistency score
    await this.updateStreak(userId, dto.habitId);

    return log;
  }

  private async updateStreak(userId: string, habitId: string) {
    const streak = await this.prisma.habitStreak.findUnique({
      where: { habitId },
    });

    if (!streak) return;

    const now = new Date();
    const lastLog = streak.lastCompletedAt;
    const isSameDay = lastLog && lastLog.toDateString() === now.toDateString();

    if (isSameDay) return;

    let newStreak = streak.currentStreak;
    let newConsistency = streak.consistencyScore;

    const msInDay = 24 * 60 * 60 * 1000;
    const diffDays = lastLog ? Math.floor((now.getTime() - lastLog.getTime()) / msInDay) : 0;

    if (!lastLog || diffDays <= 1) {
      newStreak += 1;
      newConsistency = Math.min(100, newConsistency + 5);
    } else {
      // Soft Streak Logic: Don't reset to 0 immediately if missed only a few days
      if (diffDays <= 3) {
        newStreak = Math.max(1, newStreak - diffDays);
        newConsistency = Math.max(0, newConsistency - 10);
      } else {
        newStreak = 1;
        newConsistency = Math.max(0, newConsistency - 30);
      }
    }

    await this.prisma.habitStreak.update({
      where: { habitId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(streak.longestStreak, newStreak),
        consistencyScore: newConsistency,
        lastCompletedAt: now,
      },
    });

    // Reset recovery state if active
    await this.prisma.habitRecoveryState.updateMany({
      where: { habitId },
      data: {
        missedDays: 0,
        recoveryPlanActive: false,
      },
    });
  }

  async checkMissedDays(userId: string) {
    const habits = await this.prisma.habit.findMany({
      where: { userId, isActive: true },
      include: { streak: true, recoveryState: true },
    });

    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;

    for (const habit of habits) {
      if (!habit.streak?.lastCompletedAt) continue;

      const diffDays = Math.floor((now.getTime() - habit.streak.lastCompletedAt.getTime()) / msInDay);

      if (diffDays > 1) {
        // We have missed days
        await this.prisma.habitRecoveryState.upsert({
          where: { habitId: habit.id },
          update: {
            missedDays: diffDays,
            recoveryPlanActive: diffDays >= 3, // Trigger recovery plan after 3 missed days
          },
          create: {
            userId,
            habitId: habit.id,
            missedDays: diffDays,
            recoveryPlanActive: diffDays >= 3,
          },
        });
      }
    }
  }

  async getRecommendations(userId: string, goal: string) {
    return this.prisma.habitRecommendation.findMany({
      where: { goalType: goal },
    });
  }

  async getInsights(userId: string) {
    return this.prisma.habitInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
