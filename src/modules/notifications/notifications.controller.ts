import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // ══════════════════════════════════════════════════
  //  NOTIFICATION INBOX
  // ══════════════════════════════════════════════════

  @Get()
  async getNotifications(
    @GetUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getNotifications(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch(':id/read')
  async markAsRead(@GetUser() user: User, @Param('id') id: string) {
    await this.service.markAsRead(user.id, id);
    return { status: 'ok' };
  }

  @Patch('read-all')
  async markAllAsRead(@GetUser() user: User) {
    const result = await this.service.markAllAsRead(user.id);
    return { status: 'ok', count: result.count };
  }

  @Delete(':id')
  async deleteNotification(@GetUser() user: User, @Param('id') id: string) {
    await this.service.deleteNotification(user.id, id);
    return { status: 'ok' };
  }

  // ══════════════════════════════════════════════════
  //  NOTIFICATION PREFERENCES
  // ══════════════════════════════════════════════════

  @Get('preferences')
  async getPreferences(@GetUser() user: User) {
    return this.service.getPreferences(user.id);
  }

  @Patch('preferences')
  async updatePreferences(
    @GetUser() user: User,
    @Body() body: Record<string, any>,
  ) {
    return this.service.updatePreferences(user.id, body);
  }

  // ══════════════════════════════════════════════════
  //  REMINDER SCHEDULES
  // ══════════════════════════════════════════════════

  @Get('reminders')
  async getReminders(@GetUser() user: User) {
    return this.service.getReminders(user.id);
  }

  @Patch('reminders/:type')
  async updateReminder(
    @GetUser() user: User,
    @Param('type') type: string,
    @Body() body: { scheduledTime?: string; daysOfWeek?: string[]; isActive?: boolean },
  ) {
    return this.service.updateReminder(user.id, type, body);
  }

  @Post('reminders/:type/snooze')
  async snoozeReminder(
    @GetUser() user: User,
    @Param('type') type: string,
    @Body() body: { minutes: number },
  ) {
    const minutes = body.minutes || 15;
    await this.service.snoozeReminder(user.id, type, minutes);
    return { status: 'snoozed', minutes };
  }
}

// ══════════════════════════════════════════════════
//  DEVICE TOKEN CONTROLLER (separate path)
// ══════════════════════════════════════════════════

@Controller('devices')
@UseGuards(AuthGuard('jwt'))
export class DeviceTokensController {
  constructor(private readonly service: NotificationsService) {}

  @Post('token')
  async registerToken(
    @GetUser() user: User,
    @Body() body: { token: string; platform: string },
  ) {
    const result = await this.service.registerDeviceToken(
      user.id,
      body.token,
      body.platform,
    );
    return { status: 'registered', id: result.id };
  }

  @Delete('token/:token')
  async unregisterToken(@Param('token') token: string) {
    await this.service.unregisterDeviceToken(token);
    return { status: 'unregistered' };
  }
}
