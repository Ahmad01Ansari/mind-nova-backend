import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGroupDto, GroupCheckInDto, GroupOnboardingDto, GroupExitFeedbackDto, CreateGroupPostDto } from './dto/groups.dto';

import { GroupsGateway } from './groups.gateway';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => GroupsGateway))
    private groupsGateway: GroupsGateway,
  ) {}

  async createGroup(data: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        ...data,
        insights: {
          create: {
            healthScore: 100.0,
            participationRate: 0.0,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.group.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async getRecommended(userId: string) {
    // 1. Get user's recent mood history
    const recentMoods = await this.prisma.moodLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (recentMoods.length === 0) {
      return this.findAll();
    }

    // 2. Simple logic: If avg mood is low, suggest Anxiety/Depression/Burnout groups
    const avgScore = recentMoods.reduce((acc, mood) => acc + mood.score, 0) / recentMoods.length;
    
    let targetCategories = ['All'];
    if (avgScore <= 3) {
      targetCategories = ['ANXIETY', 'BURNOUT', 'LONELINESS'];
    } else if (avgScore <= 6) {
      targetCategories = ['STRESS', 'CONFIDENCE'];
    } else {
      targetCategories = ['DISCIPLINE', 'FITNESS'];
    }

    return this.prisma.group.findMany({
      where: {
        category: { in: targetCategories },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async joinGroup(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) throw new NotFoundException('Group not found');
    if (group._count.members >= group.maxMembers) {
      throw new BadRequestException('Group is full (max members reached for intimacy)');
    }

    return this.prisma.groupMember.create({
      data: {
        userId,
        groupId,
        onboardingStatus: 'PENDING',
      },
    });
  }

  async completeOnboarding(userId: string, groupId: string, dto: GroupOnboardingDto) {
    return this.prisma.groupMember.update({
      where: {
        groupId_userId: { groupId, userId },
      },
      data: {
        onboardingStatus: 'COMPLETED',
        commitmentLevel: dto.commitmentLevel,
      },
    });
  }

  async getMemberProfile(userId: string, groupId: string) {
    return this.prisma.groupMember.findFirst({
      where: { userId, groupId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  async getGroupDetail(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId },
        },
        insights: true,
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    const member = group.members[0];
    return {
      ...group,
      isMember: !!member,
      onboardingStatus: member?.onboardingStatus || 'PENDING',
    };
  }

  async getGroupFeed(groupId: string) {
    // Prioritized Feed Logic:
    // 1. Priority field (Check-ins, Help posts)
    // 2. Recency
    return this.prisma.groupPost.findMany({
      where: { groupId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: {
            profile: { select: { firstName: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
        reactions: {
          select: { type: true, userId: true },
        },
      },
    });
  }

  async createPost(userId: string, groupId: string, dto: CreateGroupPostDto) {
    const post = await this.prisma.groupPost.create({
      data: {
        userId,
        groupId,
        content: dto.content,
        isAnonymous: dto.isAnonymous ?? true,
        backgroundGradient: dto.backgroundGradient,
        imageUrl: dto.imageUrl,
        emotion: dto.emotion,
      },
      include: {
        _count: { select: { reactions: true, comments: true } },
      },
    });

    this.groupsGateway.broadcastToGroup(groupId, 'group_feed_update', { groupId });
    await this.updateMemberActivity(userId, groupId);
    return post;
  }
  async toggleReaction(postId: string, userId: string, type: string) {
    const existing = await this.prisma.groupPostReaction.findUnique({
      where: { postId_userId_type: { postId, userId, type } },
    });

    if (existing) {
      await this.prisma.groupPostReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.groupPostReaction.create({
        data: { postId, userId, type },
      });
    }

    const post = await this.prisma.groupPost.findUnique({ where: { id: postId }, select: { groupId: true } });
    if (post) {
      this.groupsGateway.broadcastToGroup(post.groupId, 'group_post_reaction_update', { postId });
      await this.updateMemberActivity(userId, post.groupId);
    }

    return { status: existing ? 'removed' : 'added', type };
  }

  async addComment(postId: string, userId: string, content: string, isAnonymous: boolean = true, parentId?: string) {
    const comment = await this.prisma.groupPostComment.create({
      data: {
        postId,
        userId,
        content,
        isAnonymous,
        parentId,
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    const post = await this.prisma.groupPost.findUnique({ where: { id: postId }, select: { groupId: true } });
    if (post) {
      this.groupsGateway.broadcastToGroup(post.groupId, 'group_post_comment_update', { postId });
      await this.updateMemberActivity(userId, post.groupId);
    }

    return comment;
  }

  async getComments(postId: string) {
    return this.prisma.groupPostComment.findMany({
      where: { postId, parentId: null },
      include: {
        user: {
          select: {
            profile: { select: { firstName: true, avatarUrl: true } },
          },
        },
        replies: {
          include: {
            user: {
              select: {
                profile: { select: { firstName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCheckIn(userId: string, groupId: string, dto: GroupCheckInDto) {
    const checkIn = await this.prisma.groupCheckIn.create({
      data: {
        userId,
        groupId,
        emotion: dto.emotion,
        note: dto.note,
      },
    });

    // Update last activity
    await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { lastActivityAt: new Date() },
    });

    // Create a feed post automatically for the check-in (Prioritized)
    await this.prisma.groupPost.create({
      data: {
        groupId,
        userId,
        content: `Checked in feeling ${dto.emotion}. ${dto.note || ''}`,
        emotion: dto.emotion,
        priority: 2, // High priority for check-ins
      },
    });

    await this.updateMemberActivity(userId, groupId);
    return checkIn;
  }

  async updateMemberActivity(userId: string, groupId: string) {
    try {
      await this.prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId } },
        data: { lastActivityAt: new Date() },
      });
    } catch (e) {
      this.logger.error(`Failed to update member activity: ${e.message}`);
    }
  }

  async saveChatMessage(userId: string, groupId: string, content: string, isFlagged: boolean) {
    return this.prisma.groupChatMessage.create({
      data: {
        userId,
        groupId,
        content,
        isFlagged,
      },
    });
  }

  async leaveGroup(userId: string, groupId: string, dto: GroupExitFeedbackDto) {
    await this.prisma.groupExitFeedback.create({
      data: {
        userId,
        groupId,
        reason: dto.reason,
      },
    });

    return this.prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId, userId },
      },
    });
  }

  async getGroupStats(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        insights: true,
        _count: { select: { members: true } },
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    // Calculate participation rate (members active in last 24h)
    const activeMembersCount = await this.prisma.groupMember.count({
      where: {
        groupId,
        lastActivityAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const participationRate = group._count.members > 0 
      ? (activeMembersCount / group._count.members) * 100 
      : 0;

    // Update insights
    await this.prisma.groupInsight.update({
      where: { groupId },
      data: {
        participationRate,
        healthScore: participationRate > 20 ? 100 : 70, // Simple health logic
      },
    });

    return {
      ...group.insights,
      memberCount: group._count.members,
      activeToday: activeMembersCount,
    };
  }

  async getPost(postId: string) {
    const post = await this.prisma.groupPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            profile: { select: { firstName: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
        reactions: {
          select: { type: true, userId: true },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleInactiveUserRecovery() {
    this.logger.log('Running Inactive User Recovery Job...');
    
    // Find members inactive for > 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const inactiveMembers = await this.prisma.groupMember.findMany({
      where: {
        lastActivityAt: { lt: fortyEightHoursAgo },
        onboardingStatus: 'COMPLETED',
      },
      include: {
        user: true,
        group: true,
      },
    });

    for (const member of inactiveMembers) {
      this.logger.log(`Triggering recovery for user ${member.userId} in group ${member.groupId}`);
      // TODO: Call NotificationService to send "We miss you in {group.title}" push
      // For now, we'll just update a hypothetical 'recoveryTriggeredAt' or similar
    }

    return { recoveredCount: inactiveMembers.length };
  }
}
