import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Message, MessageSchema } from './schemas/message.schema';
import { CrisisModule } from '../crisis/crisis.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    CrisisModule,
    AiModule,
  ],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
