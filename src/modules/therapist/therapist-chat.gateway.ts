import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { TherapistService } from './therapist.service';
import * as jwt from 'jsonwebtoken';

interface SendMessagePayload {
  threadId: string;
  senderId: string;
  senderType: 'USER' | 'THERAPIST';
  content: string;
  messageType?: 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE';
  fileUrl?: string;
  duration?: number;
}

// Map of userId/therapistUserId -> socketId for presence tracking
const presenceMap = new Map<string, string>();

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'therapist-chat',
})
export class TherapistChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TherapistChatGateway.name);

  constructor(
    @Inject(forwardRef(() => TherapistService))
    private readonly therapistService: TherapistService,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    
    if (!token) {
      this.logger.error(`[therapist-chat] Connection rejected: No token provided.`);
      client.disconnect();
      return;
    }

    try {
      // Adding clockTolerance (60s) to prevent rejection due to minor clock drift between phone and server
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!, {
        clockTolerance: 60,
      }) as { sub: string };
      const userId = decoded.sub;
      
      client.data.userId = userId;
      presenceMap.set(userId, client.id);
      
      this.logger.log(`[therapist-chat] Securely connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error(`[therapist-chat] Connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    // Find which userId this socket belonged to
    for (const [userId, socketId] of presenceMap.entries()) {
      if (socketId === client.id) {
        presenceMap.delete(userId);
        // Broadcast offline to any rooms this client was in
        client.rooms.forEach((room) => {
          this.server.to(room).emit('presence', { userId, status: 'OFFLINE' });
        });
        // Persist OFFLINE for therapist if applicable
        try {
          await this.therapistService.updatePresenceByUserId(userId, 'OFFLINE');
        } catch (_) {
          // Not a therapist userId — ignore
        }
        this.logger.log(`[therapist-chat] disconnected: ${client.id} (user: ${userId})`);
        break;
      }
    }
  }

  // ─── Join Thread Room ─────────────────────────────────────────

  @SubscribeMessage('join_thread')
  async handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; isTherapist?: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return client.disconnect();

    const room = `thread:${data.threadId}`;
    await client.join(room);

    // Mark delivered: any SENT messages sent while offline are now DELIVERED
    await this.therapistService.markMessagesDelivered(data.threadId, data.isTherapist ? 'USER' : 'THERAPIST');

    // Update presence for therapists
    if (data.isTherapist) {
      try {
        await this.therapistService.updatePresenceByUserId(userId, 'ONLINE');
      } catch (_) {}
    }

    // Broadcast presence to room
    this.server.to(room).emit('presence', {
      userId,
      status: 'ONLINE',
    });

    this.logger.log(`[therapist-chat] ${userId} joined ${room}`);
  }

  // ─── Send Message ─────────────────────────────────────────────

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ) {
    const room = `thread:${data.threadId}`;
    const authenticatedSenderId = client.data.userId;
    if (!authenticatedSenderId) return client.disconnect();

    // Persist to database — use verified JWT userId as the authoritative senderId
    const message = await this.therapistService.createSocketMessage({
      threadId: data.threadId,
      senderId: authenticatedSenderId,
      senderType: data.senderType,
      content: data.content,
      messageType: data.messageType || 'TEXT',
      fileUrl: data.fileUrl,
      duration: data.duration,
    });

    // Broadcast to everyone in the room (including sender for confirmation)
    this.server.to(room).emit('new_message', message);

    // Emit sent-ack back to sender
    client.emit('message_status', { id: message.id, status: 'SENT' });

    this.logger.log(`[therapist-chat] message in ${room}: ${message.id}`);
  }

  // ─── Mark Seen ────────────────────────────────────────────────

  @SubscribeMessage('mark_seen')
  async handleMarkSeen(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { threadId: string; viewerSenderType: 'USER' | 'THERAPIST' },
  ) {
    const room = `thread:${data.threadId}`;
    const updatedIds = await this.therapistService.markMessagesSeen(
      data.threadId,
      data.viewerSenderType,
    );

    // Notify room about seen update
    if (updatedIds.length > 0) {
      this.server.to(room).emit('messages_seen', {
        threadId: data.threadId,
        seenBy: data.viewerSenderType,
        messageIds: updatedIds,
      });
    }
  }

  // ─── Typing Indicators ────────────────────────────────────────

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; userId: string; senderType: string },
  ) {
    const room = `thread:${data.threadId}`;
    client.to(room).emit('typing', { userId: data.userId, senderType: data.senderType, isTyping: true });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; userId: string; senderType: string },
  ) {
    const room = `thread:${data.threadId}`;
    client.to(room).emit('typing', { userId: data.userId, senderType: data.senderType, isTyping: false });
  }

  // ─── Global Presence Update ───────────────────────────────────

  @SubscribeMessage('update_status')
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    try {
      await this.therapistService.updatePresenceByUserId(userId, data.status);
      this.server.emit('presence_update', { 
        userId, 
        status: data.status,
        updatedAt: new Date().toISOString()
      });
      this.logger.log(`[presence] Global update: ${userId} is now ${data.status}`);
    } catch (e) {
      this.logger.error(`Failed to update status for ${userId}`, e.message);
    }
  }

  // ─── Meeting Signaling ────────────────────────────────────────

  @SubscribeMessage('join_meeting')
  async handleJoinMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return client.disconnect();
    const room = `meeting:${data.sessionId}`;
    await client.join(room);
    this.logger.log(`[meeting] ${userId} joined ${room}`);
    // Broadcast to others in the room that someone joined
    client.to(room).emit('meeting_presence', { userId, status: 'JOINED' });
  }

  @SubscribeMessage('leave_meeting')
  async handleLeaveMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    const room = `meeting:${data.sessionId}`;
    await client.leave(room);
    this.logger.log(`[meeting] ${userId} left ${room}`);
    client.to(room).emit('meeting_presence', { userId, status: 'LEFT' });
  }

  @SubscribeMessage('meeting_action')
  handleMeetingAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      sessionId: string; 
      userId: string; 
      action: 'MUTE' | 'UNMUTE' | 'CAMERA_ON' | 'CAMERA_OFF' | 'RAISE_HAND' | 'LOWER_HAND' | 'SHARE_SCREEN' | 'STOP_SHARE';
    },
  ) {
    const room = `meeting:${data.sessionId}`;
    // Broadcast action to everyone else in the room
    client.to(room).emit('meeting_action_update', data);
  }

  @SubscribeMessage('meeting_chat')
  handleMeetingChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; sender: string; text: string; time: string },
  ) {
    const room = `meeting:${data.sessionId}`;
    // Broadcast chat message to everyone else in the room
    client.to(room).emit('meeting_chat_message', data);
  }

  @SubscribeMessage('meeting_sync_request')
  handleMeetingSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string },
  ) {
    const room = `meeting:${data.sessionId}`;
    client.to(room).emit('meeting_sync_request', data);
  }

  // ─── Real-time Schedule Updates ────────────────────────────────
  broadcastScheduleUpdate(therapistId: string) {
    this.server.emit('schedule_update', { 
      therapistId, 
      updatedAt: new Date().toISOString() 
    });
    this.logger.log(`[schedule] Broadcast update for therapist: ${therapistId}`);
  }
}
