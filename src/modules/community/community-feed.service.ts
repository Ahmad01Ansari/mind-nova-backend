import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunityService } from './community.service';

// ─── Toxic keyword detection (Phase 1 Hybrid Moderation) ─────────────────────
const CRISIS_KEYWORDS = [
  'kill myself', 'suicide', 'end my life', 'self harm', 'cut myself',
  'want to die', 'no reason to live', 'better off dead', 'hurt myself',
];
const TOXIC_KEYWORDS = [
  'fuck you', 'kill you', 'hate you', 'die', 'loser', 'worthless',
  'shut up', 'nobody cares', 'go away', 'stupid', 'idiot',
];

@Injectable()
export class CommunityFeedService {
  private readonly logger = new Logger(CommunityFeedService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private communityService: CommunityService,
  ) {}

  // ─── Content Moderation (Phase 1: Rule-Based) ──────────────────────────────

  private moderateContent(text: string): { safe: boolean; flagReason?: string; isCrisis?: boolean } {
    const lower = text.toLowerCase();

    // Check for crisis keywords first
    for (const kw of CRISIS_KEYWORDS) {
      if (lower.includes(kw)) {
        return { safe: false, flagReason: `Crisis keyword detected: "${kw}"`, isCrisis: true };
      }
    }

    // Check for toxic keywords
    for (const kw of TOXIC_KEYWORDS) {
      if (lower.includes(kw)) {
        return { safe: false, flagReason: `Toxic content detected: "${kw}"` };
      }
    }

    return { safe: true };
  }

  // ─── Rate Limiting ─────────────────────────────────────────────────────────

  private async checkPostRateLimit(userId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.communityPost.count({
      where: { userId, createdAt: { gte: oneHourAgo } },
    });
    if (count >= 3) {
      throw new BadRequestException('You can post up to 3 times per hour. Take a breath and try again later. 💛');
    }
  }

  private async checkCommentRateLimit(userId: string): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const count = await this.prisma.postComment.count({
      where: { userId, createdAt: { gte: oneMinuteAgo } },
    });
    if (count >= 3) {
      throw new BadRequestException('Please slow down. You can comment up to 3 times per minute.');
    }
  }

  // ─── Create Post ───────────────────────────────────────────────────────────

  async createPost(userId: string, data: {
    content: string;
    emotion: string;
    type?: string;
    needType?: string;
    tags?: string[];
    isAnonymous?: boolean;
  }) {
    await this.checkPostRateLimit(userId);

    // Moderate content
    const modResult = this.moderateContent(data.content);

    // Get or create anonymous alias
    const alias = await this.communityService.getOrCreateAlias(userId);

    // Base visibility score: Help Me posts get a boost
    let baseScore = 1.0;
    if (data.type === 'HELP_ME') baseScore = 3.0;
    if (data.type === 'GRATITUDE') baseScore = 1.5;

    const post = await this.prisma.communityPost.create({
      data: {
        userId,
        aliasName: (data.isAnonymous !== false) ? alias : null,
        content: data.content,
        emotion: data.emotion,
        type: data.type || 'STANDARD',
        needType: data.needType,
        tags: data.tags || [],
        isAnonymous: data.isAnonymous !== false,
        visibilityScore: baseScore,
        isFlagged: !modResult.safe,
        flagReason: modResult.flagReason,
      },
      include: {
        _count: { select: { reactions: true, comments: true } },
      },
    });

    // If crisis content, create a notification for the user
    if (modResult.isCrisis) {
      await this.notificationsService.createNotification({
        userId,
        type: 'CRISIS_ALERT',
        title: 'We care about you 💛',
        body: 'If you\'re going through a tough time, please reach out. Help is available.',
        category: 'SAFETY',
        metadata: { postId: post.id },
      });
    }

    return post;
  }

  // ─── Feed with Emotional Ranking ───────────────────────────────────────────

  async getFeed(options: {
    tab?: string; // FOR_YOU, TRENDING
    emotion?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { tab = 'FOR_YOU', emotion, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Content expiry: only show posts from the last 72 hours
    const expiryDate = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const where: any = {
      isFlagged: false,
      createdAt: { gte: expiryDate },
    };

    if (emotion && emotion !== 'ALL') {
      where.emotion = emotion;
    }

    let orderBy: any[];

    if (tab === 'TRENDING') {
      orderBy = [{ visibilityScore: 'desc' as const }, { createdAt: 'desc' as const }];
    } else {
      // FOR_YOU: mix of recency and visibility
      orderBy = [{ createdAt: 'desc' as const }];
    }

    const posts = await this.prisma.communityPost.findMany({
      where,
      include: {
        _count: { select: { reactions: true, comments: true, bookmarks: true } },
        reactions: {
          select: { type: true, userId: true },
        },
        user: {
          select: {
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // For "FOR_YOU" tab, apply emotional ranking in-memory for better control
    if (tab === 'FOR_YOU' && posts.length > 0) {
      const scored = posts.map(post => {
        const supportCount = post.reactions.filter(r => r.type === 'SUPPORT').length;
        const feelSameCount = post.reactions.filter(r => r.type === 'FEEL_SAME').length;
        const hugCount = post.reactions.filter(r => r.type === 'HUG').length;
        const commentCount = post._count.comments;
        const totalReactions = post._count.reactions;

        // Emotional Ranking Algorithm
        const interactionScore =
          (supportCount * 2) +
          (feelSameCount * 3) +
          (hugCount * 1.5) +
          (commentCount * 1.5);

        // Recency decay: posts lose score over time
        const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
        const recencyMultiplier = Math.max(0.1, 1 - (hoursOld / 72));

        // Lonely Post Rescue: boost posts with 0 engagement older than 10 mins
        const minutesOld = hoursOld * 60;
        let lonelyBoost = 0;
        if (totalReactions === 0 && commentCount === 0 && minutesOld >= 10 && minutesOld <= 120) {
          lonelyBoost = 5.0; // Significant boost
        }

        // Help Me posts always get a boost
        const helpMeBoost = post.type === 'HELP_ME' ? 4.0 : 0;

        // New post boost: Ensure brand new posts appear at the top for immediate visibility
        const newPostBoost = hoursOld < 0.5 ? 20.0 : 0;

        const finalScore = (interactionScore * recencyMultiplier) + lonelyBoost + helpMeBoost + post.visibilityScore + newPostBoost;

        return { ...post, _calculatedScore: finalScore };
      });

      // Sort by calculated score, descending. If scores are equal, sort by newest.
      scored.sort((a, b) => {
        if (b._calculatedScore !== a._calculatedScore) {
          return b._calculatedScore - a._calculatedScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return scored;
    }

    return posts;
  }

  // ─── Personalized Feed (mood-aware) ────────────────────────────────────────

  async getPersonalizedFeed(userId: string, page = 1, limit = 20) {
    // Get user's latest mood log
    const latestMood = await this.prisma.moodLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    let emotionFilter: string | undefined;
    if (latestMood) {
      // Map score (1-10) to an emotion for feed matching
      const score = latestMood.score;
      if (score <= 2) emotionFilter = 'SAD';
      else if (score <= 4) emotionFilter = 'ANXIOUS';
      else if (score <= 5) emotionFilter = 'STRESSED';
      else if (score <= 7) emotionFilter = undefined; // Neutral - show all
      else emotionFilter = 'HAPPY';
    }

    return this.getFeed({ tab: 'FOR_YOU', emotion: emotionFilter, page, limit });
  }

  // ─── Reactions (Toggle) ────────────────────────────────────────────────────

  async toggleReaction(postId: string, userId: string, type: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.postReaction.findUnique({
      where: { postId_userId_type: { postId, userId, type } },
    });

    if (existing) {
      await this.prisma.postReaction.delete({ where: { id: existing.id } });
      // Decrease visibility score
      await this.recalculateVisibility(postId);
      return { status: 'removed', type };
    }

    await this.prisma.postReaction.create({
      data: { postId, userId, type },
    });

    // Increase visibility score
    await this.recalculateVisibility(postId);

    // Notify post author (optional, non-blocking)
    if (post.userId !== userId) {
      const alias = await this.communityService.getOrCreateAlias(userId);
      this.notificationsService.createNotification({
        userId: post.userId,
        type: 'POST_REACTION',
        title: type === 'FEEL_SAME' ? 'Someone feels the same 💛' : 'You received support 🤗',
        body: `${alias} reacted to your post`,
        category: 'COMMUNITY',
        metadata: { postId },
      }).catch(() => {}); // Fire and forget
    }

    return { status: 'added', type };
  }

  // ─── Visibility Score Recalculation ────────────────────────────────────────

  private async recalculateVisibility(postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        _count: { select: { reactions: true, comments: true, bookmarks: true } },
        reactions: { select: { type: true } },
      },
    });
    if (!post) return;

    const supportCount = post.reactions.filter(r => r.type === 'SUPPORT').length;
    const feelSameCount = post.reactions.filter(r => r.type === 'FEEL_SAME').length;
    const hugCount = post.reactions.filter(r => r.type === 'HUG').length;

    const score =
      (supportCount * 2) +
      (feelSameCount * 3) +
      (hugCount * 1.5) +
      (post._count.comments * 1.5) +
      (post._count.bookmarks * 2.5) + // Shares/Bookmarks boost
      (post.type === 'HELP_ME' ? 4.0 : 0);

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { visibilityScore: score },
    });
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  async addComment(postId: string, userId: string, data: {
    content: string;
    parentId?: string;
    isAnonymous?: boolean;
  }) {
    await this.checkCommentRateLimit(userId);

    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Moderate comment
    const modResult = this.moderateContent(data.content);

    const alias = await this.communityService.getOrCreateAlias(userId);

    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        userId,
        aliasName: (data.isAnonymous !== false) ? alias : null,
        content: data.content,
        parentId: data.parentId,
        isAnonymous: data.isAnonymous !== false,
        isFlagged: !modResult.safe,
      },
    });

    // Update visibility score
    await this.recalculateVisibility(postId);

    // Notify post author
    if (post.userId !== userId) {
      this.notificationsService.createNotification({
        userId: post.userId,
        type: 'POST_COMMENT',
        title: 'Someone replied to you 💬',
        body: `${alias} commented on your post`,
        category: 'COMMUNITY',
        metadata: { postId, commentId: comment.id },
      }).catch(() => {});
    }

    return comment;
  }

  async getComments(postId: string) {
    return this.prisma.postComment.findMany({
      where: { postId, isFlagged: false, parentId: null },
      include: {
        user: {
          select: {
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        replies: {
          where: { isFlagged: false },
          include: {
            user: {
              select: {
                profile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Bookmark ──────────────────────────────────────────────────────────────

  async toggleBookmark(postId: string, userId: string) {
    const existing = await this.prisma.postBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.postBookmark.delete({ where: { id: existing.id } });
      return { status: 'removed' };
    }

    await this.prisma.postBookmark.create({
      data: { postId, userId },
    });
    return { status: 'added' };
  }

  async getBookmarks(userId: string) {
    return this.prisma.postBookmark.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            _count: { select: { reactions: true, comments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Report ────────────────────────────────────────────────────────────────

  async reportPost(postId: string, userId: string, reason: string) {
    return this.prisma.postReport.create({
      data: { postId, userId, reason },
    });
  }

  // ─── Community Insights ────────────────────────────────────────────────────

  async getCommunityInsights() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emotionCounts = await this.prisma.communityPost.groupBy({
      by: ['emotion'],
      where: { createdAt: { gte: today }, isFlagged: false },
      _count: { _all: true },
    });

    const totalToday = await this.prisma.communityPost.count({
      where: { createdAt: { gte: today }, isFlagged: false },
    });

    return {
      totalPostsToday: totalToday,
      emotionBreakdown: emotionCounts.map(e => ({
        emotion: e.emotion,
        count: e._count._all,
      })),
    };
  }

  // ─── Get Single Post ───────────────────────────────────────────────────────

  async getPost(postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        _count: { select: { reactions: true, comments: true, bookmarks: true } },
        reactions: { select: { type: true, userId: true } },
        user: {
          select: {
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        comments: {
          where: { isFlagged: false, parentId: null },
          include: {
            replies: { where: { isFlagged: false }, orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  // ─── Daily Prompt ──────────────────────────────────────────────────────────

  getDailyPrompt(): { prompt: string; emotion: string } {
    const prompts = [
      { prompt: 'How are you feeling today?', emotion: 'ALL' },
      { prompt: 'What stressed you today?', emotion: 'STRESSED' },
      { prompt: 'What are you grateful for?', emotion: 'HAPPY' },
      { prompt: 'What made you smile today?', emotion: 'HAPPY' },
      { prompt: 'What\'s been on your mind lately?', emotion: 'ANXIOUS' },
      { prompt: 'Did anything make you feel lonely today?', emotion: 'LONELY' },
      { prompt: 'What\'s one small win you had today?', emotion: 'HAPPY' },
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return prompts[dayOfYear % prompts.length];
  }
}
