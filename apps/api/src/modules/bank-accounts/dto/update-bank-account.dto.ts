import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
