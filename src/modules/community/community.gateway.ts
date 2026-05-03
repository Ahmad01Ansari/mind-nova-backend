import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'community-chat',
})
export class CommunityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CommunityGateway.name);

  // Store user presence in rooms: socketId -> { roomId, userId, alias }
  private activeClients = new Map<string, { roomId: string; userId: string; alias: string }>();

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;

    if (!token) {
      this.logger.error(`[community-chat] Connection rejected: No token provided.`);
      client.disconnect();
      return;
    }

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as { sub: string };
      client.data.userId = decoded.sub;
      this.logger.log(`✅ Client securely connected: ${client.id} (userId: ${client.data.userId})`);
    } catch (e) {
      this.logger.error(`[community-chat] Connection rejected: Invalid or expired token.`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = this.activeClients.get(client.id);
    if (clientData) {
      const roomStr = `room:${clientData.roomId}`;
      this.activeClients.delete(client.id);

      this.server.to(roomStr).emit('participant_left', {
        userId: clientData.userId,
        alias: clientData.alias,
      });

      // Broadcast updated participant count
      this._broadcastRoomState(clientData.roomId);

      this.logger.log(`👋 Client disconnected: ${client.id} (alias: ${clientData.alias}) from room ${clientData.roomId}`);
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; alias: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const roomStr = `room:${data.roomId}`;
    client.join(roomStr);

    this.activeClients.set(client.id, { roomId: data.roomId, userId, alias: data.alias });

    this.logger.log(`👤 User ${data.alias} (${userId}) joined room ${data.roomId}`);

    this.server.to(roomStr).emit('participant_joined', {
      userId,
      alias: data.alias,
    });

    // Broadcast updated room state to all clients in the room
    this._broadcastRoomState(data.roomId);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const clientData = this.activeClients.get(client.id);
    if (clientData) {
      client.leave(`room:${data.roomId}`);
      this.activeClients.delete(client.id);

      this.server.to(`room:${data.roomId}`).emit('participant_left', {
        userId: clientData.userId,
        alias: clientData.alias,
      });

      this._broadcastRoomState(data.roomId);
    }
  }

  @SubscribeMessage('get_room_state')
  handleGetRoomState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const participants = Array.from(this.activeClients.values())
      .filter(c => c.roomId === data.roomId);

    client.emit('room_state', {
      roomId: data.roomId,
      participantCount: participants.length,
      participants: participants.map(p => ({ alias: p.alias, userId: p.userId })),
    });
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; text: string; alias: string },
  ) {
    // ─── Moderation & Safety: Keyword Detector ───────────────
    const blacklist = ['spam', 'abuse', 'hate', 'kill', 'suicide', 'die']; // Expand this in production
    let text = data.text;
    const hasForbiddenWord = blacklist.some(word => text.toLowerCase().includes(word));

    if (hasForbiddenWord) {
      this.logger.warn(`Safety: Message flagged from ${data.alias} in room ${data.roomId}`);
      text = '*** [Message removed for safety compliance] ***';
    }

    const roomStr = `room:${data.roomId}`;
    this.logger.log(`💬 Message from ${data.alias} in ${data.roomId}: ${text}`);

    this.server.to(roomStr).emit('new_message', {
      userId: client.data.userId,
      alias: data.alias,
      text: text,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('send_reaction')
  handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; emoji: string; alias: string },
  ) {
    const roomStr = `room:${data.roomId}`;
    this.server.to(roomStr).emit('new_reaction', {
      userId: client.data.userId,
      alias: data.alias,
      emoji: data.emoji,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('raise_hand')
  handleRaiseHand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; alias: string; isRaised: boolean },
  ) {
    const roomStr = `room:${data.roomId}`;
    this.server.to(roomStr).emit('hand_raised', {
      userId: client.data.userId,
      alias: data.alias,
      isRaised: data.isRaised,
    });
  }

  // ─── Internal Helpers ───────────────────────────────────────

  private _broadcastRoomState(roomId: string) {
    const participants = Array.from(this.activeClients.values())
      .filter(c => c.roomId === roomId);

    this.server.to(`room:${roomId}`).emit('room_state', {
      roomId,
      participantCount: participants.length,
      participants: participants.map(p => ({ alias: p.alias, userId: p.userId })),
    });
  }
}
