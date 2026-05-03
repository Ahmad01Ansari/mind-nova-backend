import { Module } from '@nestjs/common';
import { NotificationsController, DeviceTokensController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationScheduler } from './notification.scheduler';

@Module({
  controllers: [NotificationsController, DeviceTokensController],
  providers: [NotificationsService, NotificationScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}

