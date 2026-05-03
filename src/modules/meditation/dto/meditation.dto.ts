import { Type } from 'class-transformer';
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsEnum, 
  Min, 
  Max, 
  IsUUID 
} from 'class-validator';
import { MeditationCategory } from '@prisma/client';

export class StartMeditationSessionDto {
  @IsUUID()
  contentId: string;
}

export class CompleteMeditationSessionDto {
  @IsNumber()
  @Min(1)
  durationSecs: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  calmBefore?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  calmAfter?: number;

  @IsOptional()
  @IsBoolean()
  completedFull?: boolean;
}

export class MeditationHistoryQueryDto {
  @IsOptional()
  @IsEnum(MeditationCategory)
  category?: MeditationCategory;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take?: number;
}
