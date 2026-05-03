import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateContactDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  relation?: string;

  @IsString()
  phoneNumber: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  allowQuickSms?: boolean;

  @IsBoolean()
  @IsOptional()
  favorite?: boolean;
}

export class UpdateContactDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  relation?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  allowQuickSms?: boolean;

  @IsBoolean()
  @IsOptional()
  favorite?: boolean;
}
