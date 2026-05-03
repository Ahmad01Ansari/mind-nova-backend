import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Alias Management ──────────────────────────────────────────────

  async getOrCreateAlias(userId: string): Promise<string> {
    const existing = await this.prisma.anonymousAlias.findUnique({ where: { userId } });
    if (existing) return existing.alias;

    const adjectives = ['Calm', 'Hope', 'Moon', 'Quiet', 'Gentle', 'Bright', 'Clear', 'Soft', 'Warm', 'Kind'];
    const nouns = ['River', 'Walker', 'Mind', 'Soul', 'Cloud', 'Breeze', 'Path', 'Light', 'Heart', 'Wave'];
    
    let alias = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = Math.floor(Math.random() * 90) + 10;
      alias = `${adj}${noun}${num}`;
      
      const check = await this.prisma.anonymousAlias.findUnique({ where: { alias } });
      if (!check) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      alias = `User${Math.floor(Math.random() * 10000)}`;
    }

    await this.prisma.anonymousAlias.create({
      data: { userId, alias }
    });

    return alias;
  }

  // ─── Rooms ────────────────────────────────────────────────────────

  async getLiveRooms() {
    return this.prisma.communityRoom.findMany({
      where: { isLive: true },
      include: {
        _count: { select: { participants: { where: { leftAt: null } } } }
      },
      orderBy: { startsAt: 'desc' }
    });
  }

  async getUpcomingRooms() {
    return this.prisma.communityRoom.findMany({
      where: { isLive: false, startsAt: { gt: new Date() } },
      include: {
        _count: { select: { reminders: true } }
      },
      orderBy: { startsAt: 'asc' },
      take: 20
    });
  }

  async getRoomSeries() {
    return this.prisma.roomSeries.findMany({
      include: {
        rooms: {
          where: { startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 1
        }
      }
    });
  }

  // ─── Participant Actions ──────────────────────────────────────────

  async joinRoom(roomId: string, userId: string, isAnonymous: boolean) {
    const room = await this.prisma.communityRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const activeCount = await this.prisma.roomParticipant.count({
      where: { roomId, leftAt: null }
    });

    if (activeCount >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    let alias: string | null = null;
    if (isAnonymous) {
      alias = await this.getOrCreateAlias(userId);
    } else {
      const profile = await this.prisma.profile.findUnique({ where: { userId } });
      alias = profile?.firstName || 'User';
    }

    const participant = await this.prisma.roomParticipant.create({
      data: {
        roomId,
        userId,
        alias,
        role: 'LISTENER'
      }
    });

    return { participant, room };
  }

  async leaveRoom(roomId: string, userId: string) {
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
      orderBy: { joinedAt: 'desc' }
    });

    if (!participant) return;

    await this.prisma.roomParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() }
    });

    return { success: true };
  }

  async setReminder(roomId: string, userId: string) {
    const room = await this.prisma.communityRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const existing = await this.prisma.roomReminder.findUnique({
      where: { roomId_userId: { roomId, userId } }
    });

    if (existing) {
      await this.prisma.roomReminder.delete({ where: { id: existing.id } });
      return { status: 'removed' };
    }

    await this.prisma.roomReminder.create({
      data: { roomId, userId }
    });

    // Create a scheduled notification 10 minutes before the room starts
    const scheduledAt = new Date(room.startsAt.getTime() - 10 * 60 * 1000);
    
    // Only schedule if the room starts in the future (more than 10 mins away)
    if (scheduledAt > new Date()) {
      await this.notificationsService.createNotification({
        userId,
        type: 'COMMUNITY_REMINDER',
        title: 'Room Starting Soon',
        body: `"${room.title}" starts in 10 minutes. Join the circle!`,
        category: 'COMMUNITY',
        scheduledAt,
        metadata: { roomId }
      });
    }

    return { status: 'added' };
  }

  // ─── Feedback & Moderation ────────────────────────────────────────

  async submitFeedback(roomId: string, userId: string, feeling: string, notes?: string) {
    return this.prisma.roomFeedback.create({
      data: { roomId, userId, feeling, notes }
    });
  }

  async reportUser(roomId: string, reporterId: string, reportedId: string, reason: string) {
    return this.prisma.roomReport.create({
      data: { roomId, reporterId, reportedId, reason }
    });
  }

  // ─── Host Actions ──────────────────────────────────────────────────

  async startRoom(roomId: string) {
    return this.prisma.communityRoom.update({
      where: { id: roomId },
      data: { isLive: true }
    });
  }

  async endRoom(roomId: string) {
    await this.prisma.communityRoom.update({
      where: { id: roomId },
      data: { isLive: false, endsAt: new Date() }
    });

    await this.prisma.roomParticipant.updateMany({
      where: { roomId, leftAt: null },
      data: { leftAt: new Date() }
    });

    return { success: true };
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.communityRoom.findUnique({
      where: { id: roomId },
      include: {
        _count: { select: { participants: { where: { leftAt: null } } } },
        participants: {
          where: { leftAt: null },
          select: { id: true, alias: true, role: true, joinedAt: true, userId: true }
        },
        hostControls: true,
      }
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  // ─── Host Controls ────────────────────────────────────────────────

  async toggleMuteChat(roomId: string, muted: boolean) {
    return this.prisma.roomHostControl.upsert({
      where: { roomId },
      update: { isChatMuted: muted },
      create: { roomId, isChatMuted: muted },
    });
  }

  async removeParticipant(roomId: string, participantId: string) {
    await this.prisma.roomParticipant.update({
      where: { id: participantId },
      data: { leftAt: new Date() },
    });
    return { success: true };
  }

  async postAnnouncement(roomId: string, message: string) {
    return this.prisma.roomHostControl.upsert({
      where: { roomId },
      update: { pinnedMessage: message },
      create: { roomId, pinnedMessage: message },
    });
  }

  // ─── Admin CRUD ───────────────────────────────────────────────────

  async createRoom(data: {
    title: string;
    category: string;
    hostType: string;
    hostName: string;
    startsAt: string;
    endsAt?: string;
    maxParticipants?: number;
    isRecurring?: boolean;
    seriesId?: string;
  }) {
    return this.prisma.communityRoom.create({
      data: {
        title: data.title,
        category: data.category,
        hostType: data.hostType,
        hostName: data.hostName,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        maxParticipants: data.maxParticipants || 50,
        isRecurring: data.isRecurring || false,
        seriesId: data.seriesId || null,
      },
    });
  }

  async updateRoom(roomId: string, data: Partial<{
    title: string;
    category: string;
    hostType: string;
    hostName: string;
    startsAt: string;
    endsAt: string;
    maxParticipants: number;
    isRecurring: boolean;
    isLive: boolean;
  }>) {
    const updateData: any = { ...data };
    if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
    if (data.endsAt) updateData.endsAt = new Date(data.endsAt);
    return this.prisma.communityRoom.update({
      where: { id: roomId },
      data: updateData,
    });
  }
}
