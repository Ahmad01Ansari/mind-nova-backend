import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityFeedService } from './community-feed.service';
import { CommunityGateway } from './community.gateway';
import { CommunityScheduler } from './community.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityFeedService, CommunityGateway, CommunityScheduler],
  exports: [CommunityService, CommunityFeedService],
})
export class CommunityModule {}
