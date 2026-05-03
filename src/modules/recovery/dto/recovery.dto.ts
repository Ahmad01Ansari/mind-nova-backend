import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class StartRecoveryDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsInt()
  beforeMood?: number;

  @IsOptional()
  @IsInt()
  beforeStress?: number;
}

export class CompleteRecoveryDto {
  @IsString()
  logId: string;

  @IsOptional()
  @IsInt()
  afterMood?: number;

  @IsOptional()
  @IsInt()
  afterStress?: number;

  @IsOptional()
  @IsInt()
  durationSeconds?: number;
}
