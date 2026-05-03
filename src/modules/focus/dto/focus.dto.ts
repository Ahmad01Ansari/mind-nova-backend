import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FocusMode } from '@prisma/client';

export class StartFocusSessionDto {
  @IsEnum(FocusMode)
  mode: FocusMode;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  moodBefore?: string;

  @IsOptional()
  @IsString()
  selectedAudio?: string;
}

export class EndFocusSessionDto {
  @IsNumber()
  actualDurationSec: number;

  @IsNumber()
  completedPercent: number;

  @IsNumber()
  interruptions: number;

  @IsNumber()
  deviceInterrupted: number;

  @IsOptional()
  @IsString()
  moodAfter?: string;
}
