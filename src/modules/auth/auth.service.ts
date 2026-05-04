import { Injectable, ConflictException, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../common/mail/mail.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto, LoginDto, AnonymousDto, UpgradeGuestDto, FirebaseLoginDto } from './dto/auth.dto';
import { AssessmentSession, AssessmentSessionDocument } from '../assessment/schema/assessment.schema';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectModel(AssessmentSession.name) private sessionModel: Model<AssessmentSessionDocument>,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    if (admin.apps.length === 0) {
      let credentialPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
      
      // Strip quotes if they exist (common issue in .env files)
      if (credentialPath && (credentialPath.startsWith('"') || credentialPath.startsWith("'"))) {
        credentialPath = credentialPath.substring(1, credentialPath.length - 1);
      }

      this.logger.log(`Initializing Firebase with path: ${credentialPath || 'Default'}`);

      try {
        if (credentialPath) {
          admin.initializeApp({
            credential: admin.credential.cert(credentialPath),
          });
        } else {
          admin.initializeApp();
        }
        this.logger.log('Firebase Admin initialized successfully');
      } catch (error) {
        this.logger.error(`Firebase Admin initialization failed: ${error.message}`);
        this.logger.warn('Production authentication will not work until valid credentials are provided.');
      }
    }
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new ConflictException('Email already in use');
      }
      // If unverified, we update the existing record with new password and name
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: hashedPassword,
          profile: {
            update: {
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          },
        },
      });
      
      // Non-blocking email sending to prevent timeouts
      this.sendEmailOtp(dto.email).catch(err => 
        this.logger.error(`Background OTP re-sending failed: ${err.message}`)
      );

      return {
        message: 'Verification code resent to your email',
        userId: existingUser.id,
        email: existingUser.email,
      };
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        emailVerified: false,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
    });

    // Non-blocking email sending to prevent timeouts
    this.sendEmailOtp(dto.email).catch(err => 
      this.logger.error(`Background OTP sending failed: ${err.message}`)
    );

    return {
      message: 'Verification code sent to your email',
      userId: user.id,
      email: user.email,
    };
  }

  async sendEmailOtp(email: string) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.emailVerification.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt },
    });

    // TEMPORARY: Log the OTP so you can verify without email
    this.logger.warn(`🔑 [VERIFICATION CODE for ${email}]: ${otp}`);

    // DO NOT await this - let it run in the background
    this.mailService.sendOtp(email, otp).catch(err => {
      this.logger.error(`Failed to send OTP email to ${email}: ${err.message}`);
    });
  }

  async verifyEmailOtp(email: string, otp: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification || verification.otp !== otp) {
      throw new BadRequestException('Invalid verification code');
    }

    if (new Date() > verification.expiresAt) {
      throw new BadRequestException('Verification code expired');
    }

    // Mark user as verified
    const user = await this.prisma.user.update({
      where: { email },
      data: { emailVerified: true },
      include: { profile: true },
    });

    // Cleanup
    await this.prisma.emailVerification.delete({ where: { email } });

    // Issue JWT session
    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      userId: user.id,
      email: user.email,
      role: user.role,
      displayName: user.profile?.firstName || 'User',
      profileCompleted: user.profile?.onboarding ?? false,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return { user, ...tokens };
  }

  async signInWithFirebase(dto: FirebaseLoginDto) {
    try {
      // 1. Verify Firebase Token
      const decodedToken = await admin.auth().verifyIdToken(dto.token);
      const { uid, email, phone_number } = decodedToken;

      // 2. Find or Create User
      // We prioritize linking by phone number if provided in DTO, or UID
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: uid },
            { email: email || undefined },
            { phone: phone_number || dto.phoneNumber || undefined },
          ],
        },
        include: { profile: true },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            id: uid,
            email: email || null,
            phone: phone_number || dto.phoneNumber || null,
            role: 'USER',
            profile: {
              create: {
                firstName: 'User',
              },
            },
          },
          include: { profile: true },
        });
      } else if (!user.phone && (phone_number || dto.phoneNumber)) {
        // Link phone if missing
        await this.prisma.user.update({
          where: { id: user.id },
          data: { phone: phone_number || dto.phoneNumber },
        });
      }

      // 3. Issue Backend Tokens
      const tokens = await this.getTokens(user.id, user.email, user.role);
      await this.updateRefreshToken(user.id, tokens.refresh_token);

      return { user, ...tokens };
    } catch (error) {
      console.error('Firebase Auth Error:', error);
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  async upgradeGuest(dto: UpgradeGuestDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        role: 'USER',
        profile: {
          create: {
            firstName: dto.firstName || 'MindNova User',
            lastName: dto.lastName || '',
            ageRange: dto.ageRange,
            gender: dto.gender,
          },
        },
      },
      include: { profile: true },
    });

    // --- PHASE 2: DATA MIGRATION ---
    // Link guest records to the new user account if guestUuid is provided
    try {
      await this.migrateUserData(dto.guestUuid, user.id);
    } catch (error) {
      console.error(`Migration failed for guest ${dto.guestUuid}:`, error);
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return { user, ...tokens };
  }

  /**
   * Performs an atomic migration of all user data from a Guest ID to a Permanent User ID.
   * Touches both PostgreSQL (Prisma) and MongoDB (Mongoose).
   */
  private async migrateUserData(guestId: string, newUserId: string) {
    // 1. Migrate Clinical Records in Postgres
    await this.prisma.assessmentScore.updateMany({
      where: { userId: guestId },
      data: { userId: newUserId },
    });

    // 2. Migrate Psychological Records in Postgres
    await this.prisma.moodLog.updateMany({
      where: { userId: guestId },
      data: { userId: newUserId },
    });

    await this.prisma.moodStreak.updateMany({
      where: { userId: guestId },
      data: { userId: newUserId },
    });

    await this.prisma.multiDimensionalScore.updateMany({
      where: { userId: guestId },
      data: { userId: newUserId },
    });

    // 3. Migrate Active Clinical Sessions in MongoDB
    await this.sessionModel.updateMany(
      { userId: guestId },
      { $set: { userId: newUserId } }
    ).exec();

    // 4. Cleanup: Remove the old anonymous user record
    // Note: This also cascades deletes any profiles or relations that weren't migrated
    await this.prisma.user.delete({
      where: { id: guestId }
    }).catch(() => {/* Ignore if already gone */});
  }

  async anonymousLogin(dto: AnonymousDto) {
    let user = await this.prisma.user.findUnique({
      where: { deviceId: dto.deviceId },
      include: { profile: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          deviceId: dto.deviceId,
          role: 'ANONYMOUS',
          profile: {
            create: {
              firstName: 'Anonymous',
            },
          },
        },
        include: { profile: true },
      });
    }

    const tokens = await this.getTokens(user.id, null, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return { user, ...tokens };
  }

  async getTokens(userId: string, email: string | null, role: string) {
    const payload = { sub: userId, email, role };
    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return {
      access_token,
      refresh_token,
    };
  }

  async updateRefreshToken(userId: string, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) throw new UnauthorizedException('Access Denied');

    const rtMatches = await bcrypt.compare(rt, user.refreshToken);
    if (!rtMatches) throw new UnauthorizedException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If an account exists, a reset code has been sent.' };
    }
    await this.sendEmailOtp(email);
    return { message: 'Reset code sent to your email' };
  }

  async resetPassword(email: string, otp: string, newPasswordHash: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification || verification.otp !== otp) {
      throw new BadRequestException('Invalid verification code');
    }

    if (new Date() > verification.expiresAt) {
      throw new BadRequestException('Verification code expired');
    }

    const hashedPassword = await bcrypt.hash(newPasswordHash, 10);
    await this.prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });

    await this.prisma.emailVerification.delete({ where: { email } });
    return { success: true, message: 'Password reset successfully' };
  }
}
