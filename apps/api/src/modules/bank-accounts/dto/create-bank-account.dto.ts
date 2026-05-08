import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(160)
  bankName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(34)
  iban?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  accountNumber?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  currency!: string;

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
