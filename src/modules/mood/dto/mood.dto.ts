import { IsInt, IsString, IsOptional, IsArray, Min, Max, IsNumber, IsObject } from 'class-validator';

export class CreateMoodDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  energy?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  stress?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  anxiety?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(24)
  sleepHours?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  sleepQuality?: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  context?: {
    location?: { name?: string; lat?: number; long?: number };
    weather?: { condition?: string; tempC?: number };
    followUpAnswers?: Array<{ questionId: string; answer: string }>;
    journalRef?: string;
  };
}
