import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StartChallengeDto, CompleteDayDto, AbandonChallengeDto } from './dto/challenges.dto';

@Injectable()
export class ChallengesService {
  constructor(private prisma: PrismaService) {}

  // ─── List All Challenges ───────────────────────────────────────
  async getAll() {
    return this.prisma.challenge.findMany({
      where: { isActive: true },
      include: {
        days: {
          include: { tasks: true },
          orderBy: { dayNumber: 'asc' },
        },
        _count: { select: { userChallenges: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Challenge Detail ──────────────────────────────────────────
  async getById(id: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id },
      include: {
        days: {
          include: { tasks: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayNumber: 'asc' },
        },
        _count: { select: { userChallenges: true } },
      },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }

  // ─── Start Challenge ───────────────────────────────────────────
  async startChallenge(userId: string, dto: StartChallengeDto) {
    // FIX #9: Multi-Challenge Guard
    const existing = await this.prisma.userChallenge.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (existing) {
      throw new ConflictException(
        'You already have an active challenge. Complete or pause it first.',
      );
    }

    // Verify challenge exists
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: dto.challengeId },
      include: {
        days: {
          where: { dayNumber: 1 },
          include: { tasks: true },
        },
      },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');

    const totalTasksDay1 = challenge.days[0]?.tasks?.length ?? 0;

    // Create UserChallenge + Day 1 progress
    const userChallenge = await this.prisma.userChallenge.create({
      data: {
        userId,
        challengeId: dto.challengeId,
        preferredTime: dto.preferredTime,
        reminderEnabled: dto.reminderEnabled ?? true,
        reminderTime: dto.reminderTime,
        progress: {
          create: {
            dayNumber: 1,
            totalTasks: totalTasksDay1,
          },
        },
      },
      include: {
        challenge: {
          include: {
            days: {
              include: { tasks: { orderBy: { orderIndex: 'asc' } } },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
        progress: true,
      },
    });

    return userChallenge;
  }

  // ─── Get Active Challenge ──────────────────────────────────────
  async getActive(userId: string) {
    const active = await this.prisma.userChallenge.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        challenge: {
          include: {
            days: {
              include: { tasks: { orderBy: { orderIndex: 'asc' } } },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
        progress: {
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    if (!active) return null;

    // FIX #2: Drop-Off Recovery — check missed days
    const dropOff = this.checkDropOff(active);

    return { ...active, dropOff };
  }

  // ─── Complete Day ──────────────────────────────────────────────
  async completeDay(userId: string, dto: CompleteDayDto) {
    const uc = await this.prisma.userChallenge.findUnique({
      where: { id: dto.userChallengeId },
      include: {
        challenge: true,
        progress: true,
      },
    });

    // FIX #10: Backend Validation
    if (!uc) throw new NotFoundException('Challenge enrollment not found');
    if (uc.userId !== userId) throw new ForbiddenException('Not your challenge');
    if (uc.status !== 'ACTIVE') throw new BadRequestException('Challenge is not active');
    if (dto.dayNumber !== uc.currentDay)
      throw new BadRequestException(`You must complete Day ${uc.currentDay} first`);

    // Check if day already completed
    const existingProgress = uc.progress.find((p) => p.dayNumber === dto.dayNumber);
    if (existingProgress?.completed)
      throw new BadRequestException('Day already completed');

    // FIX #3: Partial Completion
    const percentage =
      dto.totalTasks > 0 ? dto.tasksCompleted / dto.totalTasks : 0;
    const isDayCompleted = percentage >= 0.5;

    // FIX #4: Habit Integration — create HabitLog entries for HABIT-type tasks
    const challengeDay = await this.prisma.challengeDay.findFirst({
      where: { challengeId: uc.challengeId, dayNumber: dto.dayNumber },
      include: { tasks: true },
    });

    if (challengeDay) {
      const habitTasks = challengeDay.tasks.filter(
        (t) => t.type === 'HABIT' && t.habitId,
      );
      for (const task of habitTasks) {
        try {
          await this.prisma.habitLog.create({
            data: {
              userId,
              habitId: task.habitId!,
              duration: task.duration,
            },
          });
        } catch {
          // Habit may not exist — silently skip
        }
      }
    }

    // Upsert day progress
    await this.prisma.userChallengeProgress.upsert({
      where: {
        userChallengeId_dayNumber: {
          userChallengeId: dto.userChallengeId,
          dayNumber: dto.dayNumber,
        },
      },
      update: {
        tasksCompleted: dto.tasksCompleted,
        totalTasks: dto.totalTasks,
        completionPercentage: percentage,
        completed: isDayCompleted,
        completedAt: isDayCompleted ? new Date() : null,
      },
      create: {
        userChallengeId: dto.userChallengeId,
        dayNumber: dto.dayNumber,
        tasksCompleted: dto.tasksCompleted,
        totalTasks: dto.totalTasks,
        completionPercentage: percentage,
        completed: isDayCompleted,
        completedAt: isDayCompleted ? new Date() : null,
      },
    });

    // If day completed, advance or finish
    if (isDayCompleted) {
      const isLastDay = dto.dayNumber >= uc.challenge.durationDays;

      if (isLastDay) {
        // Challenge complete!
        await this.prisma.userChallenge.update({
          where: { id: dto.userChallengeId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            lastActiveAt: new Date(),
          },
        });
      } else {
        // Initialize next day progress
        const nextDay = dto.dayNumber + 1;
        const nextDayData = await this.prisma.challengeDay.findFirst({
          where: { challengeId: uc.challengeId, dayNumber: nextDay },
          include: { tasks: true },
        });

        await this.prisma.userChallenge.update({
          where: { id: dto.userChallengeId },
          data: {
            currentDay: nextDay,
            lastActiveAt: new Date(),
            missedDays: 0,
          },
        });

        await this.prisma.userChallengeProgress.create({
          data: {
            userChallengeId: dto.userChallengeId,
            dayNumber: nextDay,
            totalTasks: nextDayData?.tasks?.length ?? 0,
          },
        });
      }

      // FIX #5: Recalculate metrics
      await this.recalculateMetrics(dto.userChallengeId);

      // FIX #7: Adaptive difficulty check
      await this.adaptDifficulty(dto.userChallengeId);
    }

    // Return updated state
    return this.prisma.userChallenge.findUnique({
      where: { id: dto.userChallengeId },
      include: {
        challenge: {
          include: {
            days: {
              include: { tasks: { orderBy: { orderIndex: 'asc' } } },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
        progress: { orderBy: { dayNumber: 'asc' } },
      },
    });
  }

  // ─── Abandon / Pause ───────────────────────────────────────────
  async abandonChallenge(userId: string, dto: AbandonChallengeDto) {
    const uc = await this.prisma.userChallenge.findUnique({
      where: { id: dto.userChallengeId },
    });

    if (!uc) throw new NotFoundException('Challenge enrollment not found');
    if (uc.userId !== userId) throw new ForbiddenException('Not your challenge');
    if (uc.status !== 'ACTIVE' && uc.status !== 'PAUSED')
      throw new BadRequestException('Challenge cannot be modified');

    return this.prisma.userChallenge.update({
      where: { id: dto.userChallengeId },
      data: {
        status: dto.pause ? 'PAUSED' : 'ABANDONED',
        abandonReason: dto.reason,
        pausedAt: dto.pause ? new Date() : null,
      },
    });
  }

  // ─── FIX #2: Drop-Off Recovery Check ──────────────────────────
  private checkDropOff(active: any) {
    if (!active) return null;

    const now = new Date();
    const lastActive = new Date(active.lastActiveAt);
    const msInDay = 24 * 60 * 60 * 1000;
    const daysSinceActive = Math.floor(
      (now.getTime() - lastActive.getTime()) / msInDay,
    );

    if (daysSinceActive <= 0) return null;

    if (daysSinceActive === 1) {
      return {
        type: 'GENTLE_REMINDER',
        message: 'Your challenge is waiting for you — just one step today.',
        daysMissed: 1,
      };
    }
    if (daysSinceActive === 2) {
      return {
        type: 'LITE_DAY',
        message: 'Try just one task today — keep the momentum alive.',
        daysMissed: 2,
      };
    }
    return {
      type: 'RESTART_OFFER',
      message: "You didn't fail — let's restart smarter.",
      daysMissed: daysSinceActive,
    };
  }

  // ─── FIX #5: Recalculate Metrics ──────────────────────────────
  private async recalculateMetrics(userChallengeId: string) {
    const uc = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
      include: { challenge: true, progress: { orderBy: { dayNumber: 'asc' } } },
    });

    if (!uc) return;

    const completedDays = uc.progress.filter((p) => p.completed).length;
    const totalDays = uc.challenge.durationDays;
    const completionRate = totalDays > 0 ? completedDays / totalDays : 0;

    // Calculate streak (consecutive completed days)
    let streakDays = 0;
    for (let i = uc.progress.length - 1; i >= 0; i--) {
      if (uc.progress[i].completed) {
        streakDays++;
      } else if (streakDays > 0) {
        // We found a gap after the streak started
        break;
      }
      // If we haven't found a completed day yet, keep going back
    }

    // Only include days that have been started/completed in the average
    const relevantProgress = uc.progress.filter(
      (p) => p.completed || p.tasksCompleted > 0,
    );
    const avgPercentage =
      relevantProgress.length > 0
        ? relevantProgress.reduce((sum, p) => sum + p.completionPercentage, 0) /
          relevantProgress.length
        : 0;

    const engagementScore = completionRate * 0.6 + avgPercentage * 0.4;

    await this.prisma.userChallenge.update({
      where: { id: userChallengeId },
      data: { completionRate, streakDays, engagementScore },
    });
  }

  // ─── FIX #7: Adaptive Difficulty ──────────────────────────────
  private async adaptDifficulty(userChallengeId: string) {
    const uc = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
      include: { progress: true },
    });

    if (!uc || uc.progress.length < 2) return; // Need at least 2 days of data

    const avgCompletion =
      uc.progress.reduce((sum, p) => sum + p.completionPercentage, 0) /
      uc.progress.length;

    let adaptationLevel = 0;
    if (avgCompletion < 0.4) {
      adaptationLevel = -1; // Struggling → ease off
    } else if (avgCompletion > 0.9 && uc.streakDays >= 3) {
      adaptationLevel = 1; // Crushing it → add challenge
    }

    if (adaptationLevel !== uc.adaptationLevel) {
      await this.prisma.userChallenge.update({
        where: { id: userChallengeId },
        data: { adaptationLevel },
      });
    }
  }
}
