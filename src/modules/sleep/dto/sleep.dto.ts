import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSleepLogDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  bedtime?: string;

  @IsString()
  @IsOptional()
  wakeTime?: string;

  @IsNumber()
  @Min(0)
  @Max(24)
  durationHours: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  quality: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(20)
  awakenings?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  stressBefore?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  morningMood?: number;
}
