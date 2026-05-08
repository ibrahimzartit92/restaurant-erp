import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateVaultDto {
  @IsString()
  @MaxLength(50)
  @IsOptional()
  code?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  openingBalance?: number;

  @IsDateString()
  @IsOptional()
  openingBalanceDate?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
