import { Module } from '@nestjs/common';
import { TherapistController, TherapistPanelController } from './therapist.controller';
import { TherapistService } from './therapist.service';
import { TherapistChatGateway } from './therapist-chat.gateway';
import { TherapistReminderService } from './therapist-reminder.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TherapistController, TherapistPanelController],
  providers: [TherapistService, TherapistChatGateway, TherapistReminderService, PrismaService],
  exports: [TherapistService],
})
export class TherapistModule {}
