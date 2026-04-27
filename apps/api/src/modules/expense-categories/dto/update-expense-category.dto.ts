import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateExpenseCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
