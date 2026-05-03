import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class AnonymousDto {
  @IsString()
  deviceId: string;
}

export class UpgradeGuestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  guestUuid: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  ageRange?: string;

  @IsString()
  @IsOptional()
  gender?: string;
}
export class FirebaseLoginDto {
  @IsString()
  token: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  otp: string;
}
