import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBankAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  accountName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  bankName?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
