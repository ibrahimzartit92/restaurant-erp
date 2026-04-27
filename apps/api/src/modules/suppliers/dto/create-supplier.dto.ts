import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  defaultDueDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
