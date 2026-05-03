import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { AiService } from '../ai/ai.service';

import { CrisisService } from '../crisis/crisis.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private crisisService: CrisisService,
    private aiService: AiService,
  ) {}

  async processUserMessage(userId: string, content: string) {
    // 1. Initial Crisis Analysis
    const crisisAnalysis = await this.crisisService.analyzeAndHandleCrisis(
      userId,
      content,
      'CHAT'
    );

    // 2. Save User Message to MongoDB
    await this.messageModel.create({
      userId,
      role: 'user',
      content,
    });

    // 2. Call AI Service (Orchestration Layer)
    try {
      const response = await this.aiService.generateResponse(userId, content);
      const aiContent = response.text;

      // 3. Save AI Message to MongoDB
      await this.messageModel.create({
        userId,
        role: 'ai',
        content: aiContent,
      });

      // 4. Final Crisis Check (Dual-layer: Primary Analysis + AI Safety Flag)
      const finalCrisis = {
        ...crisisAnalysis,
        triggerScreen: crisisAnalysis.triggerScreen || response.emergency || false,
        riskLevel: response.emergency ? 'SEVERE' : crisisAnalysis.riskLevel,
      };

      return {
        reply: aiContent,
        crisisAnalysis: finalCrisis,
        aiMeta: {
          source: response.source,
          latency: response.latency,
        }
      };
    } catch (error) {
      this.logger.error('Error calling AI service:', error.message);
      return {
        reply: "I'm having a little trouble connecting to my brain right now. Please try again in a moment.",
        crisisAnalysis,
      };
    }
  }

  async getChatHistory(userId: string) {
    return this.messageModel
      .find({ userId })
      .sort({ createdAt: 'asc' })
      .limit(50)
      .exec();
  }
}
