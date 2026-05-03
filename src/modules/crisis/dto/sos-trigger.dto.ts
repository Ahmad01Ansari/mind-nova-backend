import { IsOptional, IsString } from 'class-validator';

export class LogCrisisEventDto {
  @IsString()
  source: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
