import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { AssessmentSession, AssessmentSessionSchema } from '../assessment/schema/assessment.schema';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: AssessmentSession.name, schema: AssessmentSessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

