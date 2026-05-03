import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AnonymousDto, UpgradeGuestDto, FirebaseLoginDto, VerifyEmailDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmailOtp(dto.email, dto.otp);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() dto: { email: string }) {
    return this.authService.sendEmailOtp(dto.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: { email: string }) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: { email: string; otp: string; password: string }) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.password);
  }

  @Post('firebase')
  @HttpCode(HttpStatus.OK)
  signInWithFirebase(@Body() dto: FirebaseLoginDto) {
    return this.authService.signInWithFirebase(dto);
  }

  @Post('anonymous-session')
  @HttpCode(HttpStatus.OK)
  anonymousSession(@Body() dto: AnonymousDto) {
    return this.authService.anonymousLogin(dto);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.CREATED)
  upgradeGuest(@Body() dto: UpgradeGuestDto) {
    return this.authService.upgradeGuest(dto);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Req() req: any) {
    const userId = req.user['sub'];
    const refreshToken = req.user['refreshToken'];
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
