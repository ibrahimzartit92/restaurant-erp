import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
