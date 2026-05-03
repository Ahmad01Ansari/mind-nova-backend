import { IsString, IsNumber, IsOptional } from 'class-validator';

export class AnswerAdaptiveDto {
  @IsString()
  sessionId: string;

  @IsString()
  questionId: string;

  @IsNumber()
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  textValue?: string;
  
  @IsNumber()
  @IsOptional()
  timeTaken?: number; // Optional analytics tracking
}
