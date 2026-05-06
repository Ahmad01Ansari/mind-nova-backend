import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { ModerationService } from './moderation.service';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'groups',
})
export class GroupsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GroupsGateway.name);
  private userLastMessageTime = new Map<string, number>();

  constructor(
    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService,
    private readonly moderationService: ModerationService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;

    if (!token) {
      this.logger.error(`[groups] Connection rejected: No token provided. (${client.id})`);
      client.disconnect();
      return;
    }

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!, {
        clockTolerance: 30,
      }) as { sub: string };
      client.data.userId = decoded.sub;
      this.logger.log(`✅ Client securely connected to Groups: ${client.id} (userId: ${decoded.sub})`);
    } catch (e) {
      this.logger.error(`[groups] Connection rejected: ${e.message} (${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from Groups: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    client.join(data.groupId);
    this.logger.log(`Client ${client.id} joined room ${data.groupId}`);
  }

  @SubscribeMessage('send_group_message')
  async handleGroupMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; groupId: string; content: string },
  ) {
    // Use the authenticated userId from JWT, not the untrusted payload
    const userId = client.data.userId;
    if (!userId) {
      client.emit('error', { message: 'Authentication required.' });
      return;
    }

    const now = Date.now();
    const lastTime = this.userLastMessageTime.get(userId) || 0;

    // 1. "Slow Mode" Enforcement (5 seconds)
    if (now - lastTime < 5000) {
      client.emit('error', { message: 'Slow Mode: Please wait 5s between messages.' });
      return;
    }

    // 2. AI Moderation Check
    const moderation = await this.moderationService.analyzeTone(data.content);
    
    if (!moderation.safe && moderation.action === 'HIDE') {
      client.emit('error', { 
        message: 'Message flagged.', 
        reason: moderation.reason,
        suggestedReply: moderation.suggestedReply 
      });
      return;
    }

    // 3. Save & Broadcast
    this.userLastMessageTime.set(userId, now);
    
    // Persist to database
    await this.groupsService.saveChatMessage(userId, data.groupId, data.content, moderation.flagged || false);
    await this.groupsService.updateMemberActivity(userId, data.groupId);

    // Fetch user profile for display name
    const member = await this.groupsService.getMemberProfile(userId, data.groupId);
    
    // Broadcast message to everyone in the group room
    this.server.to(data.groupId).emit('new_group_message', {
      userId: userId,
      userName: member?.user?.profile?.firstName || 'Member',
      content: data.content,
      toneLabel: moderation.label,
      action: moderation.action,
      createdAt: new Date().toISOString(),
    });

    this.logger.log(`Group Message in ${data.groupId} from ${userId}`);
  }

  /**
   * Broadcasts an event to all members in a group room
   */
  broadcastToGroup(groupId: string, event: string, payload: any) {
    this.server.to(groupId).emit(event, payload);
    this.logger.log(`Broadcast [${event}] to room ${groupId}`);
  }
}
