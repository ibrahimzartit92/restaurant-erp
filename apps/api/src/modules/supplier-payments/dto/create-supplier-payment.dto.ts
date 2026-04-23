import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { SupplierPaymentMethod } from '../entities/supplier-payment.entity';

export class CreateSupplierPaymentDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentNumber?: string;

  @IsUUID()
  @IsOptional()
  purchaseInvoiceId?: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsEnum(SupplierPaymentMethod)
  paymentMethod!: SupplierPaymentMethod;

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
  notes?: string;
}
