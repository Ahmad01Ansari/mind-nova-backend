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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to Groups: ${client.id}`);
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
    const now = Date.now();
    const lastTime = this.userLastMessageTime.get(data.userId) || 0;

    // 1. "Slow Mode" Enforcement (30 seconds)
    if (now - lastTime < 30000) {
      client.emit('error', { message: 'Slow Mode: Please wait 30s between messages.' });
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
    this.userLastMessageTime.set(data.userId, now);
    
    // Fetch user profile for display name
    const member = await this.groupsService.getMemberProfile(data.userId, data.groupId);
    
    // Broadcast message to everyone in the group room
    this.server.to(data.groupId).emit('new_group_message', {
      userId: data.userId,
      userName: member?.user?.profile?.firstName || 'Member',
      content: data.content,
      toneLabel: moderation.label,
      action: moderation.action,
      createdAt: new Date().toISOString(),
    });

    this.logger.log(`Group Message in ${data.groupId} from ${data.userId}`);
  }

  /**
   * Broadcasts an event to all members in a group room
   */
  broadcastToGroup(groupId: string, event: string, payload: any) {
    this.server.to(groupId).emit(event, payload);
    this.logger.log(`Broadcast [${event}] to room ${groupId}`);
  }
}
