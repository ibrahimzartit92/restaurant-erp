import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PurchaseInvoiceStatus } from '../entities/purchase-invoice.entity';

export class UpdatePurchaseInvoiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(180)
  invoiceLabel?: string | null;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string | null;

  @IsUUID()
  @IsOptional()
  supplierRepresentativeId?: string | null;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsEnum(PurchaseInvoiceStatus)
  @IsOptional()
  status?: PurchaseInvoiceStatus;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  paidAmount?: number;

  @IsBoolean()
  @IsOptional()
  isMiscellaneous?: boolean;

  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @IsDateString()
  @IsOptional()
  lastPaymentDate?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
