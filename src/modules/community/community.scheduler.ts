import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CommunityScheduler {
  private readonly logger = new Logger(CommunityScheduler.name);

  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════
  //  Manage Room Lifecycle — runs every minute
  // ══════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_MINUTE)
  async manageRoomLifecycle() {
    try {
      const now = new Date();

      // 1. Auto-Start Rooms
      // Find rooms that are not live, but their start time has arrived.
      // Make sure we only start rooms that haven't ended yet.
      const roomsToStart = await this.prisma.communityRoom.updateMany({
        where: {
          isLive: false,
          startsAt: { lte: now },
          OR: [
            { endsAt: null },
            { endsAt: { gt: now } }
          ]
        },
        data: { isLive: true }
      });

      if (roomsToStart.count > 0) {
        // this.logger.log(`🟢 Automatically started ${roomsToStart.count} Community Rooms.`);
      }

      // 2. Auto-End Rooms
      // Find live rooms whose end time has arrived OR they have been running for > 2 hours without an endsAt.
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const roomsToEnd = await this.prisma.communityRoom.findMany({
        where: {
          isLive: true,
          OR: [
            { endsAt: { lte: now } },
            { endsAt: null, startsAt: { lte: twoHoursAgo } }
          ]
        }
      });

      if (roomsToEnd.length > 0) {
        // this.logger.log(`🔴 Automatically ending ${roomsToEnd.length} Community Rooms.`);
        
        for (const room of roomsToEnd) {
          await this.prisma.communityRoom.update({
            where: { id: room.id },
            data: { isLive: false }
          });

          // Kick active participants
          await this.prisma.roomParticipant.updateMany({
            where: { roomId: room.id, leftAt: null },
            data: { leftAt: now }
          });
        }
      }
    } catch (error) {
      this.logger.error('❌ Failed to manage community room lifecycle:', error);
    }
  }
}
