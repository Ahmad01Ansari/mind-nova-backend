import { IsString, IsObject, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class SubmitAssessmentDto {
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, number>; // Maps question_id/index to score
}

export class InitializeSessionDto {
  @IsString()
  @IsNotEmpty()
  assessmentId: string;

  @IsString()
  @IsOptional()
  depth?: 'short' | 'standard' | 'advanced';
}

export class SaveProgressDto {
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, number>;

  @IsNumber()
  @IsNotEmpty()
  currentIndex: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
