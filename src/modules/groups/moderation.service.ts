import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly aiUrl: string;
  private readonly aiSecret: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.aiUrl = this.configService.get<string>('AI_SERVICE_URL')!;
    this.aiSecret = this.configService.get<string>('FASTAPI_BRIDGE_SECRET')!;
    if (!this.aiUrl) {
      this.logger.error('AI_SERVICE_URL is missing in ModerationService');
    }
  }

  async analyzeTone(text: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiUrl}/analyze/tone`,
          { text },
          { headers: { 'x-bridge-secret': this.aiSecret } },
        ),
      );
      return (response as any).data;
    } catch (error) {
      this.logger.error(`AI Tone Analysis Failed: ${error.message}`);
      return { safe: true, action: 'ALLOW', label: 'SAFE' }; // Fallback to allow
    }
  }

  async checkCrisis(text: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiUrl}/analyze/crisis`,
          { text },
          { headers: { 'x-bridge-secret': this.aiSecret } },
        ),
      );
      return (response as any).data;
    } catch (error) {
      this.logger.error(`AI Crisis Analysis Failed: ${error.message}`);
      return { isCrisis: false };
    }
  }
}
