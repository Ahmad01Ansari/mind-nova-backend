import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsInt()
  @IsOptional()
  maxMembers?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsString()
  @IsOptional()
  rules?: string;

  @IsString()
  @IsOptional()
  welcomeMessage?: string;
}

export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;
}

export class GroupCheckInDto {
  @IsString()
  @IsNotEmpty()
  emotion: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class GroupOnboardingDto {
  @IsString()
  @IsNotEmpty()
  commitmentLevel: string;

  @IsString()
  @IsNotEmpty()
  goal: string;
}

export class GroupExitFeedbackDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateGroupPostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsString()
  @IsOptional()
  backgroundGradient?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  emotion?: string;
}
