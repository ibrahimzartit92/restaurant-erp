import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
