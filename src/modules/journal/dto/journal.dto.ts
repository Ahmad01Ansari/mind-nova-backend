import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  moodState?: string;

  @IsString()
  @IsOptional()
  journalType?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;
}

export class UpdateJournalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;
}

export class SearchJournalDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  mood?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  skip?: number;

  @IsNumber()
  @IsOptional()
  take?: number;
}
