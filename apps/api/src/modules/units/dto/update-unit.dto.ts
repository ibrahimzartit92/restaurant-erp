import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
