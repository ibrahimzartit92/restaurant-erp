import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export enum FinancialPaymentMethod {
  Cash = 'cash',
  Bank = 'bank',
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

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  referenceNumber?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
