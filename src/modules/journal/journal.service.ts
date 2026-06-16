import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateJournalDto, UpdateJournalDto, SearchJournalDto } from './dto/journal.dto';
import axios from 'axios';

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  private extractTitle(content: string): string {
    const firstSentence = content.split(/[.!?\n]/)[0].trim();
    if (!firstSentence) return 'Untitled Entry';
    return firstSentence.length > 40 ? firstSentence.substring(0, 40) + '...' : firstSentence;
  }

  private countWords(content: string): number {
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  async createEntry(userId: string, dto: CreateJournalDto) {
    const safeContent = dto.content || '';
    const autoTitle = dto.title || this.extractTitle(safeContent);
    const words = this.countWords(safeContent);

    const entry = await this.prisma.journalEntry.create({
      data: {
        userId,
        title: autoTitle,
        content: safeContent,
        moodState: dto.moodState,
        journalType: dto.journalType || 'FREE_WRITE',
        wordCount: words,
        isDraft: dto.isDraft || false,
        draftUpdatedAt: dto.isDraft ? new Date() : null,
        tags: dto.tags?.length 
          ? { create: dto.tags.map(t => ({ name: t })) }
          : undefined,
      },
      include: { tags: true }
    });

    if (!entry.isDraft && words > 20) {
      this.triggerAsyncAiInsight(entry.id, safeContent);
    }

    return entry;
  }

  async updateEntry(userId: string, id: string, dto: UpdateJournalDto) {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { id }
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Journal entry not found');
    }

    const newContent = dto.content ?? existing.content;
    const newTitle = dto.title ?? this.extractTitle(newContent);
    const newWordCount = this.countWords(newContent);

    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        title: newTitle,
        content: newContent,
        moodState: dto.moodState ?? existing.moodState,
        isDraft: dto.isDraft,
        isFavorite: dto.isFavorite,
        isPinned: dto.isPinned,
        isLocked: dto.isLocked,
        draftUpdatedAt: dto.isDraft ? new Date() : existing.draftUpdatedAt,
        wordCount: newWordCount,
      },
      include: { tags: true, aiInsights: true }
    });
  }

  async getEntryById(userId: string, id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { tags: true, media: true, aiInsights: true }
    });
    if (!entry || entry.userId !== userId) throw new NotFoundException('Journal entry not found');

    // Fetch related memory/entries (Optimized dummy logic for demo)
    const relatedEntries = await this.prisma.journalEntry.findMany({
      where: { 
        userId, 
        id: { not: id },
        OR: [
          { moodState: entry.moodState },
          { journalType: entry.journalType }
        ]
      },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });

    return { ...entry, relatedEntries };
  }

  async getHistory(userId: string, query: SearchJournalDto) {
    const skip = query.skip ? Number(query.skip) : 0;
    const take = query.take ? Number(query.take) : 20;

    const whereClause: any = { userId };
    if (query.mood) whereClause.moodState = query.mood;
    if (query.type) whereClause.journalType = query.type;
    if (query.q) {
      whereClause.content = { contains: query.q, mode: 'insensitive' };
    }

    return this.prisma.journalEntry.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { tags: true, aiInsights: true }
    });
  }

  async getAnalytics(userId: string) {
    const streak = await this.prisma.journalStreak.findUnique({ where: { userId } });
    const count = await this.prisma.journalEntry.count({ where: { userId, isDraft: false } });
    
    // Calculate most common mood from last 30 entries
    const recentEntries = await this.prisma.journalEntry.findMany({
      where: { userId, isDraft: false, moodState: { not: null } },
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: { moodState: true }
    });
    const moodCounts: Record<string, number> = {};
    for (const e of recentEntries) {
      if (e.moodState) moodCounts[e.moodState] = (moodCounts[e.moodState] || 0) + 1;
    }
    const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Neutral';

    return {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalEntries: count,
      mostCommonMood,
      emotionalTrendScore: 4.2
    };
  }

  async getMemoryResurface(userId: string) {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Look for entries within ±7 days of 1 year ago
    const from = new Date(oneYearAgo);
    from.setDate(from.getDate() - 7);
    const to = new Date(oneYearAgo);
    to.setDate(to.getDate() + 7);

    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        userId,
        isDraft: false,
        createdAt: { gte: from, lte: to }
      },
      orderBy: { createdAt: 'desc' },
      include: { tags: true, aiInsights: true }
    });

    if (!entry) return null;

    const yearsAgo = now.getFullYear() - entry.createdAt.getFullYear();
    return {
      ...entry,
      yearsAgo,
      memoryLabel: yearsAgo === 1 ? '1 Year Ago' : `${yearsAgo} Years Ago`,
    };
  }

  async getDailyPrompt(userId: string) {
    // Get most recent mood to contextualise the prompt
    const recentEntry = await this.prisma.journalEntry.findFirst({
      where: { userId, isDraft: false },
      orderBy: { createdAt: 'desc' },
      select: { moodState: true, createdAt: true }
    });

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const mood = recentEntry?.moodState?.toLowerCase() ?? 'neutral';

    const promptMap: Record<string, string[]> = {
      calm: [
        'What is one thing you appreciate about yourself today?',
        'Describe a small moment that made you smile recently.',
        'What does your ideal peaceful day look like?',
      ],
      anxious: [
        'What is one worry you can let go of right now?',
        'Name three things within your control today.',
        'What would you tell a friend feeling the way you do?',
      ],
      sad: [
        'What is one tiny thing that brought you comfort today?',
        'Write about a time you overcame something difficult.',
        'What does your inner self need most right now?',
      ],
      happy: [
        'How can you carry this good energy into tomorrow?',
        'What made today worth remembering?',
        'Who deserves gratitude from you today?',
      ],
    };

    const prompts = promptMap[mood] ?? promptMap['calm'];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    return {
      prompt,
      context: `Based on your ${timeOfDay} patterns and recent ${mood} state.`,
      timeOfDay,
      detectedMood: recentEntry?.moodState ?? 'Neutral',
    };
  }

  /// Fire and forget background processor
  private triggerAsyncAiInsight(entryId: string, content: string) {
    // We don't await this to keep the API response snappy
    (async () => {
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL;
        if (!aiServiceUrl) return;

        const entry = await this.prisma.journalEntry.findUnique({ where: { id: entryId } });
        if (!entry) return;
        const response = await axios.post(
          `${aiServiceUrl}/analyze/journal`,
          {
            userId: entry.userId,
            content: content,
            moodState: entry.moodState,
          },
          {
            headers: {
              'X-Bridge-Secret': process.env.FASTAPI_BRIDGE_SECRET || 'mock_secret',
              'Content-Type': 'application/json',
            },
            timeout: 25000,
          },
        );

        const data = response.data;

        await this.prisma.journalAiInsight.create({
          data: {
            entryId,
            tone: data.tone || 'Reflective',
            emotionalScore: data.emotionalScore || 5.0,
            summary: data.summary || 'Insight processed.',
            suggestedAction: data.suggestedAction || 'Keep writing!',
            detectedTriggers: data.detectedTriggers || [],
          }
        });
      } catch (e) {
        console.error('Journal AI Analysis Failed:', e.message);
      }
    })();
  }
}
