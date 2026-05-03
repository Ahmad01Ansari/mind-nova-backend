import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MeditationCategory } from '@prisma/client';
import { 
  StartMeditationSessionDto, 
  CompleteMeditationSessionDto,
  MeditationHistoryQueryDto 
} from './dto/meditation.dto';

@Injectable()
export class MeditationService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const [streak, analytics, recentSessions] = await Promise.all([
      this.prisma.meditationStreak.findUnique({ where: { userId } }),
      this.prisma.meditationAnalytics.findUnique({ where: { userId } }),
      this.prisma.meditationSession.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 3,
        include: { content: true }
      }),
    ]);

    return {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalSessions: streak?.totalSessions ?? 0,
      totalMinutes: streak?.totalMinutes ?? 0,
      badges: streak?.badges ?? [],
      mostEffectiveCategory: analytics?.mostEffectiveCategory ?? null,
      favoriteCategory: analytics?.favoriteCategory ?? null,
      averageCalmImprovement: analytics?.averageCalmImprovement ?? 0,
      recentSessions,
    };
  }

  async getCategories() {
    return Object.values(MeditationCategory);
  }

  async getMasterCatalog(query?: any) {
    return this.prisma.meditationContent.findMany({
      where: query?.category ? { category: query.category } : {},
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRecommended(userId: string) {
    // 1. Fetch user's recent Grounding/Journal data to build an insight.
    // Deep logic would go here. For now, we return 3 curated recommendations.
    
    // We try to find content tagged or categorized effectively based on analytics
    const analytics = await this.prisma.meditationAnalytics.findUnique({ where: { userId } });
    
    const targetCategory = analytics?.mostEffectiveCategory || MeditationCategory.SLEEP;

    const recommended = await this.prisma.meditationContent.findMany({
      where: { category: targetCategory },
      take: 3
    });

    // Fallback if target category has no content yet
    if (recommended.length === 0) {
      return this.prisma.meditationContent.findMany({ take: 3 });
    }

    return recommended;
  }

  async startSession(userId: string, dto: StartMeditationSessionDto) {
    const content = await this.prisma.meditationContent.findUnique({
      where: { id: dto.contentId }
    });

    if (!content) throw new NotFoundException('Meditation content not found');

    // We don't necessarily log it here yet, we wait for completion to officially log the session,
    // or we can pre-create an incomplete session. We'll return the track data.
    return {
      message: 'Session prepared',
      content
    };
  }

  async completeSession(userId: string, contentId: string, dto: CompleteMeditationSessionDto) {
    const session = await this.prisma.meditationSession.create({
      data: {
        userId,
        contentId,
        durationSecs: dto.durationSecs,
        calmBefore: dto.calmBefore,
        calmAfter: dto.calmAfter,
        completedFull: dto.completedFull ?? true,
      }
    });

    // Await crunching: Streak + Analytics so the frontend gets updated data on immediate refresh
    await this.updateStreakAndAnalytics(userId, dto.durationSecs, contentId, dto.calmBefore, dto.calmAfter);

    return session;
  }

  async getHistory(userId: string, query: MeditationHistoryQueryDto) {
    return this.prisma.meditationSession.findMany({
      where: {
        userId,
        ...(query.category ? { content: { category: query.category } } : {})
      },
      include: {
        content: true,
      },
      orderBy: { completedAt: 'desc' },
      skip: Number(query.skip ?? 0),
      take: Number(query.take ?? 20),
    });
  }

  async toggleFavorite(userId: string, contentId: string) {
    const existing = await this.prisma.meditationFavorite.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId
        }
      }
    });

    if (existing) {
      await this.prisma.meditationFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.meditationFavorite.create({
      data: { userId, contentId }
    });
    return { favorited: true };
  }

  async getFavorites(userId: string) {
    const favs = await this.prisma.meditationFavorite.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { savedAt: 'desc' },
    });
    return favs.map(f => f.content);
  }

  async getAnalytics(userId: string) {
    return this.prisma.meditationAnalytics.findUnique({ where: { userId } });
  }

  // ─── Temporary Seeder ───────────────────────────────────────────
  async seedMockDatabase() {
    // Prevent double seeding
    const existing = await this.prisma.meditationContent.findFirst();
    if (existing) return { message: 'Already seeded' };

    await this.prisma.meditationContent.createMany({
      data: [
        {
          title: 'Deep Sleep Binaurals',
          subtitle: 'Drift away with 432Hz binaural beats.',
          description: 'A deeply restorative sleep track designed to slow down brain waves and prepare you for deep REM sleep.',
          category: MeditationCategory.SLEEP,
          durationMinutes: 45,
          difficulty: 'Beginner',
          bestTimeOfDay: 'Evening',
          audioUrl: 'https://example-cloudflare-r2-bucket.com/audio/sleep.mp3', // Placeholder
          backgroundTheme: 'Starry Night',
          voiceType: 'None',
          ambientSoundType: 'Binaural',
          tags: ['sleep', 'deep rest', 'binaural'],
          isFeatured: true,
        },
        {
          title: 'Panic Reset Protocol',
          subtitle: 'A fast-acting tool to lower your heart rate.',
          description: 'Guided breathwork to help you ground yourself when experiencing extreme anxiety or a panic attack.',
          category: MeditationCategory.PANIC_RECOVERY,
          durationMinutes: 5,
          difficulty: 'Beginner',
          bestTimeOfDay: 'Anytime',
          audioUrl: 'https://example-cloudflare-r2-bucket.com/audio/panic-reset.mp3', // Placeholder
          backgroundTheme: 'Rainy Room',
          voiceType: 'Female',
          ambientSoundType: 'Rain',
          tags: ['panic', 'anxiety', 'grounding'],
          isFeatured: true,
        },
        {
          title: 'Morning Momentum',
          subtitle: 'Start your day with intent and clarity.',
          description: 'Set your focus for the day with positive visualization and an energetic ambient track.',
          category: MeditationCategory.MORNING,
          durationMinutes: 10,
          difficulty: 'Intermediate',
          bestTimeOfDay: 'Morning',
          audioUrl: 'https://example-cloudflare-r2-bucket.com/audio/morning.mp3', // Placeholder
          backgroundTheme: 'Sunrise',
          voiceType: 'Male',
          ambientSoundType: 'Forest',
          tags: ['morning', 'energy', 'focus'],
          isFeatured: false,
        }
      ]
    });
    return { message: 'Database seeded successfully' };
  }

  // ─── Private Gamification / Analytics ─────────────────────────────

  private async updateStreakAndAnalytics(userId: string, durationSecs: number, contentId: string, calmBefore?: number, calmAfter?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await this.prisma.meditationStreak.findUnique({ where: { userId } });
    const lastDate = streak?.lastSessionDate ? new Date(streak.lastSessionDate) : null;

    let newStreak = 1;
    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) newStreak = streak!.currentStreak;
      else if (diffDays === 1) newStreak = streak!.currentStreak + 1;
      else newStreak = 1;
    }

    const newTotal = (streak?.totalSessions ?? 0) + 1;
    const newMinutes = (streak?.totalMinutes ?? 0) + Math.round(durationSecs / 60);
    const newLongest = Math.max(newStreak, streak?.longestStreak ?? 0);

    const badges = [...(streak?.badges ?? [])];
    if (!badges.includes('first_meditation')) badges.push('first_meditation');
    if (newTotal >= 10 && !badges.includes('mindful_10')) badges.push('mindful_10');
    if (newStreak >= 7 && !badges.includes('7_days_calm')) badges.push('7_days_calm');

    await this.prisma.meditationStreak.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalSessions: newTotal,
        totalMinutes: newMinutes,
        badges,
        lastSessionDate: new Date(),
      },
      update: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalSessions: newTotal,
        totalMinutes: newMinutes,
        badges,
        lastSessionDate: new Date(),
      },
    });

    // Real Analytics Recalculation
    const sessions = await this.prisma.meditationSession.findMany({
      where: { userId },
      include: { content: true }
    });

    if (sessions.length > 0) {
      let totalLift = 0;
      let validLifts = 0;
      
      const categoryLiftMap: Record<string, { totalLift: number, count: number }> = {};
      const categoryFrequencyMap: Record<string, number> = {};

      for (const s of sessions) {
        if (s.calmBefore !== null && s.calmAfter !== null) {
          const lift = s.calmAfter - s.calmBefore;
          totalLift += lift;
          validLifts++;

          const cat = s.content?.category;
          if (cat) {
            if (!categoryLiftMap[cat]) categoryLiftMap[cat] = { totalLift: 0, count: 0 };
            categoryLiftMap[cat].totalLift += lift;
            categoryLiftMap[cat].count++;
          }
        }
        
        const cat = s.content?.category;
        if (cat) {
          categoryFrequencyMap[cat] = (categoryFrequencyMap[cat] || 0) + 1;
        }
      }

      const avgImprovement = validLifts > 0 ? (totalLift / validLifts) * 10 : 0; // * 10 to make it a percentage of 10 point scale or raw percentage

      let bestCat: MeditationCategory | null = null;
      let highestAvgLift = -1;
      for (const [cat, data] of Object.entries(categoryLiftMap)) {
        const avg = data.totalLift / data.count;
        if (avg > highestAvgLift) {
          highestAvgLift = avg;
          bestCat = cat as MeditationCategory;
        }
      }

      let favCat: MeditationCategory | null = null;
      let highestFreq = 0;
      for (const [cat, freq] of Object.entries(categoryFrequencyMap)) {
        if (freq > highestFreq) {
          highestFreq = freq;
          favCat = cat as MeditationCategory;
        }
      }

      await this.prisma.meditationAnalytics.upsert({
        where: { userId },
        create: {
          userId,
          mostEffectiveCategory: bestCat,
          favoriteCategory: favCat,
          averageCalmImprovement: avgImprovement,
        },
        update: {
          mostEffectiveCategory: bestCat,
          favoriteCategory: favCat,
          averageCalmImprovement: avgImprovement,
        }
      });
    }
  }
}
