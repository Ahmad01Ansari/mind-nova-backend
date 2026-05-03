import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AiResponse {
  text: string;
  source: 'groq' | 'nvidia' | 'together' | 'hf' | 'fallback';
  confidence: number;
  latency: number;
  emergency?: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private cache = new Map<string, { response: AiResponse; timestamp: number }>();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private readonly DAILY_LIMIT = 50;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async generateResponse(userId: string, prompt: string): Promise<AiResponse> {
    const startTime = Date.now();

    // 1. Safety Check (Crisis Detection)
    if (this.isCrisisPrompt(prompt)) {
      return {
        text: "I'm really sorry you're feeling this way. You're not alone. I've activated SOS mode to help you connect with support. Please consider calling or texting the 988 Suicide & Crisis Lifeline right now — it's free, confidential, and available 24/7.",
        source: 'fallback',
        confidence: 1.0,
        latency: Date.now() - startTime,
        emergency: true,
      };
    }

    // 2. Rate Limiting Check
    const canProceed = await this.checkAndIncrementRateLimit(userId);
    if (!canProceed) {
      return {
        text: "You've reached your daily limit for AI responses. Let's pick this up tomorrow, or feel free to check out our other resources!",
        source: 'fallback',
        confidence: 0.5,
        latency: Date.now() - startTime,
      };
    }

    // 3. Check Cache
    const cached = this.cache.get(prompt);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`Cache hit for prompt: ${prompt.substring(0, 30)}...`);
      return cached.response;
    }

    // 3. Fetch User Context (RAG-lite)
    const context = await this.getUserContext(userId);

    // 4. Provider Chain
    const providers = [
      (p: string) => this.tryGroq(p, context),
      (p: string) => this.tryNvidia(p, context),
      (p: string) => this.tryHuggingFace(p, context),
    ];

    for (const provider of providers) {
      try {
        const response = await provider(prompt);
        if (response) {
          this.cache.set(prompt, { response, timestamp: Date.now() });
          return response;
        }
      } catch (error) {
        this.logger.warn(`Provider failed: ${error.message}`);
        continue;
      }
    }

    // 5. Final Fallback
    return {
      text: "I'm here to listen, but I'm having a bit of trouble processing that right now. How are you feeling overall today?",
      source: 'fallback',
      confidence: 0.5,
      latency: Date.now() - startTime,
    };
  }

  private isCrisisPrompt(prompt: string): boolean {
    const crisisKeywords = ['suicide', 'want to die', 'kill myself', 'end it all', 'hurt myself', 'don\'t want to live'];
    const lowerPrompt = prompt.toLowerCase();
    return crisisKeywords.some((keyword) => lowerPrompt.includes(keyword));
  }

  /**
   * Fallback crisis analysis using AI if the Python bridge is down.
   */
  async analyzeCrisisWithAI(text: string): Promise<{ riskLevel: string; category: string; suggestions: string[] }> {
    try {
      const prompt = `Analyze this text for mental health crisis risk. Return ONLY a JSON object: {"riskLevel": "LOW|MED|HIGH|SEVERE|EMERGENCY", "category": "DEPRESSION|ANXIETY|STRESS|OTHER", "suggestions": ["suggestion1", "suggestion2"]}\n\nText: "${text}"`;
      const response = await this.tryGroq(prompt, "No context for crisis check.");
      if (response) {
        const match = response.text.match(/\{.*\}/s);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (e) {
      this.logger.error(`AI Crisis Analysis Fallback failed: ${e.message}`);
    }
    return { riskLevel: 'LOW', category: 'OTHER', suggestions: [] };
  }

  private getSystemPrompt(): string {
    return "You are MindNova AI, a compassionate and professional mental health support assistant. Your goal is to provide supportive, evidence-based guidance. If a user is in immediate danger, encourage them to seek professional help or call emergency services. Keep your responses concise and warm.";
  }

  private async getUserContext(userId: string): Promise<string> {
    try {
      const [profile, moods, scores] = await Promise.all([
        this.prisma.profile.findUnique({ where: { userId } }),
        this.prisma.moodLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        this.prisma.assessmentScore.findMany({
          where: { userId },
          include: { assessment: true },
          orderBy: { createdAt: 'desc' },
          take: 2,
        }),
      ]);

      let context = `--- USER CONTEXT ---\n`;
      if (profile) {
        context += `Profile: ${profile.firstName || 'User'}, Goals: ${profile.goals?.join(', ') || 'N/A'}\n`;
      }
      if (moods.length > 0) {
        context += `Recent Moods: ${moods.map(m => `[Score: ${m.score}/10, Stress: ${m.stress}/10, Note: ${m.note || 'None'}]`).join(' | ')}\n`;
      }
      if (scores.length > 0) {
        context += `Recent Assessments: ${scores.map(s => `${s.assessment.title} (${s.severityLevel})`).join(', ')}\n`;
      }
      context += `--------------------\n`;
      return context;
    } catch (error) {
      this.logger.error(`Failed to fetch user context: ${error.message}`);
      return "--- USER CONTEXT UNAVAILABLE ---";
    }
  }

  private async checkAndIncrementRateLimit(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const usage = await this.prisma.aiUsage.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          userId,
          date: today,
          count: 1,
        },
      });

      return usage.count <= this.DAILY_LIMIT;
    } catch (error) {
      this.logger.error(`Rate limit check failed: ${error.message}`);
      return true; // Fail open to not block users if DB is slow
    }
  }

  private async tryGroq(prompt: string, context: string): Promise<AiResponse | null> {
    const start = Date.now();
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) return null;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: this.getSystemPrompt() + "\n\n" + context },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 5000,
        },
      );

      return {
        text: response.data.choices[0].message.content,
        source: 'groq',
        confidence: 0.95,
        latency: Date.now() - start,
      };
    } catch (e) {
      throw new Error(`Groq: ${e.message}`);
    }
  }

  private async tryNvidia(prompt: string, context: string): Promise<AiResponse | null> {
    const start = Date.now();
    const apiKey = this.configService.get<string>('NVIDIA_API_KEY');
    if (!apiKey) return null;

    try {
      const response = await axios.post(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          model: 'meta/llama-3.1-70b-instruct',
          messages: [
            { role: 'system', content: this.getSystemPrompt() + "\n\n" + context },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 500,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 5000,
        },
      );

      return {
        text: response.data.choices[0].message.content,
        source: 'nvidia',
        confidence: 0.9,
        latency: Date.now() - start,
      };
    } catch (error) {
      throw new Error(`NVIDIA: ${error.message}`);
    }
  }

  private async tryHuggingFace(prompt: string, context: string): Promise<AiResponse | null> {
    const start = Date.now();
    const apiKey = this.configService.get<string>('HF_API_KEY');
    if (!apiKey) return null;

    try {
      const fullPrompt = `${this.getSystemPrompt()}\n\n${context}\n\nUser: ${prompt}\nNova:`;
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        { inputs: fullPrompt },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 10000,
        },
      );

      const text = Array.isArray(response.data) ? response.data[0].generated_text : response.data.generated_text;

      return {
        text: text || "I couldn't generate a response just now.",
        source: 'hf',
        confidence: 0.8,
        latency: Date.now() - start,
      };
    } catch (e) {
      throw new Error(`HF: ${e.message}`);
    }
  }
}
