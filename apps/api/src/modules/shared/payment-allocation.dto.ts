import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export enum FinancialPaymentMethod {
  Cash = 'cash',
  Bank = 'bank',
  Vault = 'vault',
}

export class PaymentAllocationDto {
  @IsEnum(FinancialPaymentMethod)
  paymentMethod!: FinancialPaymentMethod;

  @IsUUID()
  @IsOptional()
  drawerId?: string | null;

  @IsUUID()
  @IsOptional()
  bankAccountId?: string | null;

  @IsUUID()
  @IsOptional()
  vaultId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  @IsOptional()
  paymentDate?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  referenceNumber?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
