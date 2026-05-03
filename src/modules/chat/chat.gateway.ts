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
import { ChatService } from './chat.service';
import { Logger, UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; content: string },
  ) {
    this.logger.log(`Message from ${data.userId}: ${data.content}`);

    // Emit 'thinking' state back to the user
    client.emit('ai_state', { state: 'thinking' });

    // Process via service (saves to DB and calls FastAPI)
    const result = await this.chatService.processUserMessage(data.userId, data.content);

    // Emit the actual reply and idle state
    client.emit('ai_reply', { 
      content: result.reply,
      crisisAnalysis: result.crisisAnalysis
    });
    client.emit('ai_state', { state: 'idle' });
  }

  @SubscribeMessage('get_history')
  async handleGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const history = await this.chatService.getChatHistory(data.userId);
    client.emit('chat_history', history);
  }
}
