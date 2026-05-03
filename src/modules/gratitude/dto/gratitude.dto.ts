import { IsString, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { GratitudeMemoryType } from '@prisma/client';

export class CreateGratitudeDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  moodState?: string;
  
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;
}

export class UploadMemoryDto {
  @IsString()
  gratitudeEntryId: string;

  @IsEnum(GratitudeMemoryType)
  type: GratitudeMemoryType;

  @IsString()
  @IsOptional()
  emotionalLabel?: string;
  
  // A real app might expect a multipart file upload here, 
  // but since we are returning signed URLs, we might just require a content type.
  @IsString()
  @IsOptional()
  contentType?: string;
}
