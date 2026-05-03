import { IsString, IsEnum, IsOptional } from 'class-validator';
import { AssessmentMode } from '@prisma/client';

export class StartAdaptiveDto {
  @IsString()
  treeId: string; // e.g. 'main_clinical_tree'

  @IsEnum(AssessmentMode)
  @IsOptional()
  mode?: AssessmentMode;
}
