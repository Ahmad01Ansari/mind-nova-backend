import { Controller, Get, Post, Put, Delete, Query, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CrisisService } from './crisis.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UpsertCrisisPlanDto } from './dto/crisis-plan.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { LogCrisisEventDto } from './dto/sos-trigger.dto';
import type { User } from '@prisma/client';

@Controller('crisis')
@UseGuards(AuthGuard('jwt'))
export class CrisisController {
  constructor(private readonly crisisService: CrisisService) {}

  // ─── Emergency Resources ───────────────────────────────────
  @Get('resources')
  async getResources(
    @Query('country') country?: string,
    @Query('region') region?: string,
  ) {
    return this.crisisService.getEmergencyResources(country || 'US', region);
  }

  // ─── Support Plan (Crisis Plan) ────────────────────────────
  @Get('plan')
  async getPlan(@GetUser('id') userId: string) {
    const plan = await this.crisisService.getCrisisPlan(userId);
    return plan ?? { warningSigns: [], calmingActions: [], reasonsToStay: [], safePlaces: [], notes: null };
  }

  @Post('plan')
  async upsertPlan(
    @GetUser('id') userId: string,
    @Body() dto: UpsertCrisisPlanDto,
  ) {
    return this.crisisService.upsertCrisisPlan(userId, dto);
  }

  // ─── Trusted Contacts (Safe Contacts) ──────────────────────
  @Get('contacts')
  async getContacts(@GetUser('id') userId: string) {
    return this.crisisService.getContacts(userId);
  }

  @Post('contacts')
  async addContact(
    @GetUser('id') userId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.crisisService.addContact(userId, dto);
  }

  @Put('contacts/:id')
  async updateContact(
    @GetUser('id') userId: string,
    @Param('id') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.crisisService.updateContact(userId, contactId, dto);
  }

  @Delete('contacts/:id')
  async deleteContact(
    @GetUser('id') userId: string,
    @Param('id') contactId: string,
  ) {
    return this.crisisService.deleteContact(userId, contactId);
  }

  @Post('contacts/:id/verify')
  async verifyContact(
    @GetUser('id') userId: string,
    @Param('id') contactId: string,
  ) {
    return this.crisisService.markContactVerified(userId, contactId);
  }

  @Post('contacts/:id/used')
  async markContactUsed(
    @GetUser('id') userId: string,
    @Param('id') contactId: string,
  ) {
    return this.crisisService.markContactUsed(userId, contactId);
  }

  // ─── SOS + Events ─────────────────────────────────────────
  @Post('sos/trigger')
  async triggerSos(@GetUser('id') userId: string) {
    return this.crisisService.triggerSos(userId);
  }

  @Post('log-event')
  async logEvent(
    @GetUser('id') userId: string,
    @Body() dto: LogCrisisEventDto,
  ) {
    return this.crisisService.logCrisisEvent(userId, dto);
  }

  @Post('mark-safe')
  async markSafe(@GetUser('id') userId: string) {
    return this.crisisService.markSafe(userId);
  }
}
