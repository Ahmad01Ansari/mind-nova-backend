import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class StartChallengeDto {
  @IsString()
  challengeId: string;

  @IsOptional()
  @IsString()
  preferredTime?: string; // "MORNING", "AFTERNOON", "EVENING"

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsString()
  reminderTime?: string; // "08:00"
}

export class CompleteDayDto {
  @IsString()
  userChallengeId: string;

  @IsInt()
  dayNumber: number;

  @IsInt()
  tasksCompleted: number;

  @IsInt()
  totalTasks: number;
}

export class AbandonChallengeDto {
  @IsString()
  userChallengeId: string;

  @IsBoolean()
  pause: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
