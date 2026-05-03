import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { MoodModule } from './modules/mood/mood.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { ChatModule } from './modules/chat/chat.module';
import { UsersModule } from './modules/users/users.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AiReportsModule } from './modules/ai-reports/ai-reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { CrisisModule } from './modules/crisis/crisis.module';
import { MailModule } from './common/mail/mail.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdaptiveModule } from './modules/adaptive/adaptive.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { GratitudeModule } from './modules/gratitude/gratitude.module';
import { JournalModule } from './modules/journal/journal.module';
import { GroundingModule } from './modules/grounding/grounding.module';
import { MeditationModule } from './modules/meditation/meditation.module';
import { AudioModule } from './modules/audio/audio.module';
import { FocusModule } from './modules/focus/focus.module';
import { TherapistModule } from './modules/therapist/therapist.module';
import { CommunityModule } from './modules/community/community.module';
import { GroupsModule } from './modules/groups/groups.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { HabitsModule } from './modules/habits/habits.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MailModule,
    CrisisModule,
    MongooseModule.forRoot(process.env.MONGODB_URL || ''),
    AuthModule,
    MoodModule,
    AssessmentModule,
    ChatModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    ScheduleModule.forRoot(),
    AiReportsModule,
    UsersModule,
    NotificationsModule,
    AdaptiveModule,
    ScoringModule,
    GratitudeModule,
    JournalModule,
    GroundingModule,
    MeditationModule,
    AudioModule,
    FocusModule,
    TherapistModule,
    CommunityModule,
    GroupsModule,
    RecoveryModule,
    HabitsModule,
    ChallengesModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
