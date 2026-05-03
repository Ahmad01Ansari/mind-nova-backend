import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  gender?: string;
  ageRange?: string;
  goals?: string[];
  baselineStress?: number;
  baselineSleep?: number;
  baselineMood?: number;
  weight?: number;
  height?: number;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(userId: string, data: UpdateProfileDto) {
    console.log(`Upserting profile for user ${userId}:`, data);
    try {
      // 1. Upsert Profile
      const profile = await this.prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          ...data,
          onboarding: true,
        },
        update: {
          ...data,
          onboarding: true,
        },
      });

      // 2. Create the first MoodLog entry from the baseline, if provided
      if (data.baselineMood !== undefined && data.baselineStress !== undefined) {
        // We ensure we don't duplicate baseline logs. Only create if user has 0 logs
        const logCount = await this.prisma.moodLog.count({ where: { userId } });
        if (logCount === 0) {
          // Convert 1-10 mood to 1-5 scale (approx)
          const scaledScore = Math.max(1, Math.min(5, Math.round(data.baselineMood / 2)));
          await this.prisma.moodLog.create({
            data: {
              userId,
              score: scaledScore,
              note: 'Initial Baseline from Onboarding',
              tags: {
                create: [
                  { name: 'Baseline' },
                  ...(data.baselineStress > 7 ? [{ name: 'High Stress' }] : []),
                  ...(data.baselineSleep && data.baselineSleep < 5 ? [{ name: 'Poor Sleep' }] : []),
                ],
              },
            },
          });
        }
      }

      return profile;
    } catch (error) {
      console.error('Failed to upsert profile:', error);
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async getProfile(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
    });
  }
}
