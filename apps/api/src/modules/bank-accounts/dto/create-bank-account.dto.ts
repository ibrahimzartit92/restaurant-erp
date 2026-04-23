import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  accountName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  bankName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
