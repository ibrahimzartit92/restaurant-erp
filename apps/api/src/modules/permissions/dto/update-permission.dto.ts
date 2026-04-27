import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  module?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
