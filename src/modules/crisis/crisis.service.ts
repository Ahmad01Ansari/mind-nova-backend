import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CrisisRiskLevel, CrisisCategory } from '@prisma/client';
import { UpsertCrisisPlanDto } from './dto/crisis-plan.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { LogCrisisEventDto } from './dto/sos-trigger.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CrisisService {
  private readonly logger = new Logger(CrisisService.name);
  private readonly aiServiceUrl: string;
  private readonly bridgeSecret: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private aiService: AiService,
  ) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL')!;
    if (!this.aiServiceUrl) {
      this.logger.error('CRITICAL: AI_SERVICE_URL is not defined in environment');
    }
    this.bridgeSecret = this.config.get<string>('FASTAPI_BRIDGE_SECRET')!;
  }

  // ═══════════════════════════════════════════════════════════
  // CRISIS ANALYSIS (existing)
  // ═══════════════════════════════════════════════════════════

  /**
   * Analyzes text for crisis indicators and logs events if risk is detected.
   */
  async analyzeAndHandleCrisis(
    userId: string,
    text: string,
    source: string,
    location?: { lat: number; lng: number; acc?: number },
  ): Promise<{ 
    riskLevel: CrisisRiskLevel; 
    category: CrisisCategory; 
    triggerScreen: boolean;
    suggestions: string[];
  }> {
    try {
      this.logger.log(`Analyzing crisis risk for user ${userId} from source: ${source}`);

      // 1. Call AI Microservice
      const response = await axios.post(
        `${this.aiServiceUrl}/analyze/crisis`,
        { text },
        {
          headers: { 'x-bridge-secret': this.bridgeSecret },
          timeout: 30000,
        },
      );

      const { riskLevel, category, analysis, suggestions } = response.data;
      
      this.logger.log(`Risk Level Detected: ${riskLevel} | Category: ${category}`);
      this.logger.log(`Suggestions Generated: ${suggestions?.length || 0}`);

      // 2. Map to Prisma Enums (ensure safety)
      const mappedRisk = this.mapRiskLevel(riskLevel);
      const mappedCategory = this.mapCategory(category);

      // 3. Log event if risk is anything above LOW
      if (mappedRisk !== CrisisRiskLevel.LOW) {
        try {
          await this.prisma.crisisEvent.create({
            data: {
              userId,
              riskLevel: mappedRisk,
              category: mappedCategory,
              triggerText: text.length > 500 ? text.substring(0, 500) + '...' : text,
              source,
              latitude: location?.lat,
              longitude: location?.lng,
              accuracy: location?.acc,
              adminNotes: analysis,
            },
          });

          // 4. Update aggregate CrisisScore
          await this.updateCrisisScore(userId, mappedRisk);
        } catch (dbError) {
          this.logger.error(`Failed to log crisis event to DB: ${dbError.message}. Risk analysis will still proceed.`);
        }
      }

      // 5. Determine if UI should trigger emergency screen (HIGH or above)
      const triggerScreen = ([
        CrisisRiskLevel.HIGH,
        CrisisRiskLevel.SEVERE,
        CrisisRiskLevel.EMERGENCY,
      ] as CrisisRiskLevel[]).includes(mappedRisk);

      return {
        riskLevel: mappedRisk,
        category: mappedCategory,
        triggerScreen,
        suggestions: suggestions || [],
      };
    } catch (error) {
      this.logger.warn(`Primary crisis analysis failed (Bridge Offline). Using AI Fallback...`);
      
      try {
        const fallback = await this.aiService.analyzeCrisisWithAI(text);
        
        const mappedRisk = this.mapRiskLevel(fallback.riskLevel);
        const mappedCategory = this.mapCategory(fallback.category);
        
        const triggerScreen = ([
          CrisisRiskLevel.HIGH,
          CrisisRiskLevel.SEVERE,
          CrisisRiskLevel.EMERGENCY,
        ] as CrisisRiskLevel[]).includes(mappedRisk);

        return {
          riskLevel: mappedRisk,
          category: mappedCategory,
          triggerScreen,
          suggestions: fallback.suggestions || [],
        };
      } catch (fallbackError) {
        this.logger.error(`AI Crisis Fallback also failed: ${fallbackError.message}`);
        return {
          riskLevel: CrisisRiskLevel.LOW,
          category: CrisisCategory.OTHER,
          triggerScreen: false,
          suggestions: [],
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CRISIS PLAN (Support Plan)
  // ═══════════════════════════════════════════════════════════

  async getCrisisPlan(userId: string) {
    return this.prisma.crisisPlan.findUnique({ where: { userId } });
  }

  async upsertCrisisPlan(userId: string, dto: UpsertCrisisPlanDto) {
    const existing = await this.prisma.crisisPlan.findUnique({ where: { userId } });

    if (existing) {
      return this.prisma.crisisPlan.update({
        where: { userId },
        data: {
          warningSigns: dto.warningSigns ?? existing.warningSigns,
          calmingActions: dto.calmingActions ?? existing.calmingActions,
          reasonsToStay: dto.reasonsToStay ?? existing.reasonsToStay,
          safePlaces: dto.safePlaces ?? existing.safePlaces,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          isGuestBackup: dto.isGuestBackup ?? existing.isGuestBackup,
          version: { increment: 1 },
        },
      });
    }

    return this.prisma.crisisPlan.create({
      data: {
        userId,
        warningSigns: dto.warningSigns ?? [],
        calmingActions: dto.calmingActions ?? [],
        reasonsToStay: dto.reasonsToStay ?? [],
        safePlaces: dto.safePlaces ?? [],
        notes: dto.notes,
        isGuestBackup: dto.isGuestBackup ?? false,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // TRUSTED CONTACTS (Safe Contacts)
  // ═══════════════════════════════════════════════════════════

  async getContacts(userId: string) {
    return this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: [{ favorite: 'desc' }, { priority: 'desc' }, { name: 'asc' }],
    });
  }

  async addContact(userId: string, dto: CreateContactDto) {
    return this.prisma.trustedContact.create({
      data: {
        userId,
        name: dto.name,
        relation: dto.relation,
        phoneNumber: dto.phoneNumber,
        priority: dto.priority ?? 0,
        allowQuickSms: dto.allowQuickSms ?? false,
        favorite: dto.favorite ?? false,
      },
    });
  }

  async updateContact(userId: string, contactId: string, dto: UpdateContactDto) {
    // Verify ownership
    const contact = await this.prisma.trustedContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    if (contact.userId !== userId) throw new ForbiddenException('Not your contact');

    return this.prisma.trustedContact.update({
      where: { id: contactId },
      data: {
        name: dto.name,
        relation: dto.relation,
        phoneNumber: dto.phoneNumber,
        priority: dto.priority,
        allowQuickSms: dto.allowQuickSms,
        favorite: dto.favorite,
      },
    });
  }

  async deleteContact(userId: string, contactId: string) {
    const contact = await this.prisma.trustedContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    if (contact.userId !== userId) throw new ForbiddenException('Not your contact');

    return this.prisma.trustedContact.delete({ where: { id: contactId } });
  }

  async markContactVerified(userId: string, contactId: string) {
    const contact = await this.prisma.trustedContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    if (contact.userId !== userId) throw new ForbiddenException('Not your contact');

    return this.prisma.trustedContact.update({
      where: { id: contactId },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  async markContactUsed(userId: string, contactId: string) {
    const contact = await this.prisma.trustedContact.findUnique({ where: { id: contactId } });
    if (!contact || contact.userId !== userId) return;

    return this.prisma.trustedContact.update({
      where: { id: contactId },
      data: { lastUsedAt: new Date() },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SOS TRIGGER + EVENT LOGGING
  // ═══════════════════════════════════════════════════════════

  async triggerSos(userId: string) {
    this.logger.warn(`🚨 SOS triggered by user ${userId}`);

    // Log the SOS event
    try {
      await this.prisma.crisisEvent.create({
        data: {
          userId,
          riskLevel: CrisisRiskLevel.EMERGENCY,
          category: CrisisCategory.OTHER,
          source: 'SOS_TRIGGER',
          triggerText: 'User manually triggered SOS mode',
        },
      });

      await this.updateCrisisScore(userId, CrisisRiskLevel.EMERGENCY);
    } catch (e) {
      this.logger.error(`Failed to log SOS event: ${e.message}`);
    }

    // Return priority contacts for quick-call
    const contacts = await this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: [{ favorite: 'desc' }, { priority: 'desc' }],
      take: 5,
    });

    return {
      status: 'sos_active',
      contacts,
      message: 'SOS mode activated. Priority contacts retrieved.',
    };
  }

  async logCrisisEvent(userId: string, dto: LogCrisisEventDto) {
    try {
      await this.prisma.crisisEvent.create({
        data: {
          userId,
          riskLevel: CrisisRiskLevel.MED,
          category: CrisisCategory.OTHER,
          source: dto.source,
          triggerText: dto.action ?? dto.notes,
          adminNotes: dto.notes,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to log crisis event: ${e.message}`);
    }

    return { status: 'logged' };
  }

  async markSafe(userId: string) {
    this.logger.log(`User ${userId} marked themselves safe`);

    try {
      // Log a resolution event
      await this.prisma.crisisEvent.create({
        data: {
          userId,
          riskLevel: CrisisRiskLevel.LOW,
          category: CrisisCategory.OTHER,
          source: 'SELF_RESOLUTION',
          triggerText: 'User confirmed they are feeling safer',
          isHandled: true,
          handledAt: new Date(),
        },
      });

      // Reset crisis score
      await this.prisma.crisisScore.upsert({
        where: { userId },
        update: { score: 0, lastRiskLevel: CrisisRiskLevel.LOW },
        create: { userId, score: 0, lastRiskLevel: CrisisRiskLevel.LOW },
      });
    } catch (e) {
      this.logger.error(`Failed to log safe resolution: ${e.message}`);
    }

    return { status: 'success', message: 'We\'re glad you\'re feeling safer. Take care.' };
  }

  // ═══════════════════════════════════════════════════════════
  // EMERGENCY RESOURCES (existing)
  // ═══════════════════════════════════════════════════════════

  async getEmergencyResources(countryCode: string = 'US', regionCode?: string) {
    return this.prisma.emergencyResource.findMany({
      where: {
        countryCode,
        ...(regionCode ? { regionCode } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  private async updateCrisisScore(userId: string, riskLevel: CrisisRiskLevel) {
    // Basic scoring logic: MED=0.3, HIGH=0.6, SEVERE=0.8, EMERGENCY=1.0
    const riskMap = {
      [CrisisRiskLevel.LOW]: 0.0,
      [CrisisRiskLevel.MED]: 0.3,
      [CrisisRiskLevel.HIGH]: 0.6,
      [CrisisRiskLevel.SEVERE]: 0.8,
      [CrisisRiskLevel.EMERGENCY]: 1.0,
    };

    const newScore = riskMap[riskLevel];

    await this.prisma.crisisScore.upsert({
      where: { userId },
      update: {
        score: { set: newScore },
        lastRiskLevel: riskLevel,
      },
      create: {
        userId,
        score: newScore,
        lastRiskLevel: riskLevel,
      },
    });
  }

  private mapRiskLevel(risk: string): CrisisRiskLevel {
    const valid = Object.values(CrisisRiskLevel);
    return valid.includes(risk as any) ? (risk as CrisisRiskLevel) : CrisisRiskLevel.MED;
  }

  private mapCategory(cat: string): CrisisCategory {
    const valid = Object.values(CrisisCategory);
    return valid.includes(cat as any) ? (cat as CrisisCategory) : CrisisCategory.OTHER;
  }
}
