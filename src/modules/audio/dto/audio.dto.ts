import { IsString, IsOptional, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { AudioCategoryType } from '@prisma/client';

export class AudioQueryDto {
  @IsOptional()
  @IsEnum(AudioCategoryType)
  category?: AudioCategoryType;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skip?: number;
}

export class CreateAudioTrackDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AudioCategoryType)
  category: AudioCategoryType;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsString()
  audioUrl: string;

  @IsOptional()
  @IsString()
  artworkUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationSeconds?: number;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsString()
  moodBenefit?: string;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class MarkPlayedDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  progress?: number; // seconds elapsed
}

export class RegisterDownloadDto {
  @IsString()
  localPath: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fileSize?: number;
}
