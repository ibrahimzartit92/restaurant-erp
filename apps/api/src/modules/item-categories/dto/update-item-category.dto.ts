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

  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
