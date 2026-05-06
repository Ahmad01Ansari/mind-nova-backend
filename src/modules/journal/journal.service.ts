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
    
    return {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalEntries: count,
      mostCommonMood: 'Calm', // Mock
      emotionalTrendScore: 4.2  // Mock
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
