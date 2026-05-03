import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGratitudeDto, UploadMemoryDto } from './dto/gratitude.dto';
import { GratitudeMemoryType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class GratitudeService {
  constructor(private prisma: PrismaService) {}

  async createGratitude(userId: string, dto: CreateGratitudeDto) {
    const entry = await this.prisma.gratitudeEntry.create({
      data: {
        userId,
        content: dto.content,
        category: dto.category,
        tags: dto.tags || [],
        moodState: dto.moodState,
        isFavorite: dto.isFavorite || false,
      },
      include: { memories: true },
    });

    await this.updateStreak(userId);
    return entry;
  }

  async getHistory(userId: string, skip = 0, take = 20) {
    const entries = await this.prisma.gratitudeEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { memories: true },
    });
    
    // Calculate grouped timeline (Today, Yesterday, This Week, etc) on the client side 
    // or return a simple flat list and let Riverpod handle grouping.
    return entries;
  }

  async getMemoryVault(userId: string) {
    // Return all memory items
    return this.prisma.gratitudeMemory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { entry: true },
    });
  }

  async uploadMemory(userId: string, dto: UploadMemoryDto) {
    // Stub for Cloudflare R2 Upload functionality.
    // In a real app, use AWS SDK to generate a signed PUT URL.
    const mockSignedUrl = `https://r2.cloudflare.com/upload/${userId}/${crypto.randomUUID()}`;
    const mockMediaUrl = `https://cdn.mindnova.com/${userId}/${crypto.randomUUID()}`;

    const memory = await this.prisma.gratitudeMemory.create({
      data: {
        userId,
        gratitudeEntryId: dto.gratitudeEntryId,
        type: dto.type,
        mediaUrl: mockMediaUrl,
        emotionalLabel: dto.emotionalLabel,
      },
    });

    return {
      uploadUrl: mockSignedUrl, // Client uses this to upload
      memory, // Saved representation
    };
  }

  async favoriteEntry(userId: string, id: string) {
    const entry = await this.prisma.gratitudeEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) throw new NotFoundException('Entry not found');

    return this.prisma.gratitudeEntry.update({
      where: { id },
      data: { isFavorite: !entry.isFavorite },
    });
  }

  async getAnalytics(userId: string) {
    const streak = await this.prisma.gratitudeStreak.findUnique({ where: { userId } });
    const totalEntries = await this.prisma.gratitudeEntry.count({ where: { userId } });

    // Mock an AI Mood Lift correlation (this would normally consult the ML backend)
    const moodLiftScore = totalEntries > 5 ? 18 : 0;
    const moodLiftMessage = totalEntries > 5 
      ? "Your mood improves by 18% after gratitude journaling." 
      : "Keep journaling to unlock mood insights.";

    return {
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      totalEntries,
      moodLiftScore,
      moodLiftMessage,
    };
  }

  async getCategories(userId: string) {
    // Return aggregated category counts
    const categoryStats = await this.prisma.gratitudeEntry.groupBy({
      by: ['category'],
      where: { userId, category: { not: null } },
      _count: { category: true },
    });
    
    return categoryStats.map((c) => ({
      name: c.category,
      count: c._count.category,
    }));
  }

  // --- Helpers ---
  private async updateStreak(userId: string) {
    let streak = await this.prisma.gratitudeStreak.findUnique({ where: { userId } });
    const now = new Date();

    if (!streak) {
      streak = await this.prisma.gratitudeStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastLogDate: now,
          milestonesUnlocked: ['First Gratitude Entry'],
        },
      });
      return streak;
    }

    const lastLog = streak.lastLogDate;
    const isSameDay = lastLog && lastLog.toDateString() === now.toDateString();
    
    // Simplified streak logic: increment if not same day.
    // In production, check if it's exactly 1 day diff vs > 1 day to break.
    if (!isSameDay) {
      const msInDay = 24 * 60 * 60 * 1000;
      
      // Safe fallback if lastLog is somehow null
      const lastLogTimeMs = lastLog ? lastLog.getTime() : 0;
      const diffMs = lastLog ? (now.getTime() - lastLogTimeMs) : 0;
      
      let newStreak = streak.currentStreak;
      
      if (!lastLog || diffMs <= msInDay * 1.5) { // Roughly next day or first time updating after creation
        newStreak += 1;
      } else {
        newStreak = 1; // Broken
      }

      await this.prisma.gratitudeStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(streak.longestStreak, newStreak),
          lastLogDate: now,
        },
      });
    }
    return streak;
  }
}
