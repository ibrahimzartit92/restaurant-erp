import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { SupplierPaymentMethod } from '../entities/supplier-payment.entity';

export class UpdateSupplierPaymentDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentNumber?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @IsEnum(SupplierPaymentMethod)
  @IsOptional()
  paymentMethod?: SupplierPaymentMethod;

  @IsUUID()
  @IsOptional()
  drawerId?: string | null;

  @IsUUID()
  @IsOptional()
  bankAccountId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  referenceNumber?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
