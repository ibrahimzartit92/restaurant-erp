import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWarehouseDto {
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
}
