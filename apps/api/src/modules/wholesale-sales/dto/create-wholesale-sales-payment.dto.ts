import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { WholesaleSalesPaymentMethod } from '../entities/wholesale-sales-payment.entity';

export class CreateWholesaleSalesPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentNumber?: string | null;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsEnum(WholesaleSalesPaymentMethod)
  paymentMethod!: WholesaleSalesPaymentMethod;

  @IsOptional()
  @IsUUID()
  drawerId?: string | null;

  @IsOptional()
  @IsUUID()
  vaultId?: string | null;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNumber?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
