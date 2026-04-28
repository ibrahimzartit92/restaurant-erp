import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateBankAccountDto {
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
  @MaxLength(160)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(34)
  iban?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  accountNumber?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

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
