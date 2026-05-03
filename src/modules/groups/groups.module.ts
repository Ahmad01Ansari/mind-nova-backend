import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ModerationService } from './moderation.service';
import { GroupsGateway } from './groups.gateway';

@Module({
  imports: [PrismaModule, HttpModule, ConfigModule],
  controllers: [GroupsController],
  providers: [GroupsService, ModerationService, GroupsGateway],
  exports: [GroupsService],
})
export class GroupsModule {}
