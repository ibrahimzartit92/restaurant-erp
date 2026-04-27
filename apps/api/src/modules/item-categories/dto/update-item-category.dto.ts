import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateItemCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
