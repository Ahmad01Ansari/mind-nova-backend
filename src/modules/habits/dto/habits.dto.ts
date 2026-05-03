import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateHabitDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string; // MIND, BODY, FOCUS, RECOVERY, SOCIAL

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsBoolean()
  @IsOptional()
  isMicro?: boolean;

  @IsBoolean()
  @IsOptional()
  isRoutine?: boolean;

  @IsString()
  @IsOptional()
  routineType?: string; // MORNING, NIGHT, CUSTOM

  @IsString()
  @IsOptional()
  preferredTime?: string;

  @IsString()
  @IsOptional()
  triggerType?: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsInt()
  @IsOptional()
  difficultyLevel?: number;
}

export class CompleteHabitDto {
  @IsString()
  habitId: string;

  @IsInt()
  @IsOptional()
  moodBefore?: number;

  @IsInt()
  @IsOptional()
  moodAfter?: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsInt()
  @IsOptional()
  actualDuration?: number;
}
