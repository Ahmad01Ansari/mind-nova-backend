import { IsString, IsOptional, IsInt, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum GroundingExerciseType {
  SENSORY_54321 = 'SENSORY_54321',
  PANIC_RESET = 'PANIC_RESET',
  TOUCH_HOLD = 'TOUCH_HOLD',
  BODY_SCAN = 'BODY_SCAN',
  COLOR_BREATHING = 'COLOR_BREATHING',
  SAFE_PLACE = 'SAFE_PLACE',
}

export enum SafePlaceEnvironment {
  BEACH = 'BEACH',
  FOREST = 'FOREST',
  RAIN_ROOM = 'RAIN_ROOM',
  MOUNTAIN = 'MOUNTAIN',
  FIREPLACE = 'FIREPLACE',
  NIGHT_SKY = 'NIGHT_SKY',
  GARDEN = 'GARDEN',
  COZY_BEDROOM = 'COZY_BEDROOM',
}

export class CreateGroundingSessionDto {
  @IsEnum(GroundingExerciseType)
  exerciseType: GroundingExerciseType;

  @IsEnum(SafePlaceEnvironment)
  @IsOptional()
  environment?: SafePlaceEnvironment;

  @IsInt()
  @Type(() => Number)
  durationSecs: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  calmBefore?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  calmAfter?: number;

  @IsBoolean()
  @IsOptional()
  wouldRepeat?: boolean;

  @IsBoolean()
  @IsOptional()
  completedFull?: boolean;
}

export class SubmitCalmRatingDto {
  @IsInt()
  @Min(1)
  @Max(10)
  calmBefore: number;

  @IsInt()
  @Min(1)
  @Max(10)
  calmAfter: number;

  @IsBoolean()
  @IsOptional()
  wouldRepeat?: boolean;
}

export class FavoriteEnvironmentDto {
  @IsEnum(SafePlaceEnvironment)
  environment: SafePlaceEnvironment;
}

export class GroundingHistoryQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  skip?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  take?: number;

  @IsEnum(GroundingExerciseType)
  @IsOptional()
  type?: GroundingExerciseType;
}
