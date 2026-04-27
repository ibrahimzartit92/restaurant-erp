import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PurchaseInvoiceStatus } from '../entities/purchase-invoice.entity';

export class CreatePurchaseInvoiceLineDto {
  @IsUUID()
  itemId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  lineTotal?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseInvoiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(180)
  invoiceLabel?: string;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string | null;

  @IsUUID()
  @IsOptional()
  supplierRepresentativeId?: string | null;

  @IsDateString()
  invoiceDate!: string;

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

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseInvoiceLineDto)
  items!: CreatePurchaseInvoiceLineDto[];
}
