import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertCrisisPlanDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warningSigns?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  calmingActions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  reasonsToStay?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  safePlaces?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isGuestBackup?: boolean;
}
