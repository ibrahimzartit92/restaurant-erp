import {
  ArrayMinSize,
  IsArray,
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
import { Type } from 'class-transformer';
import { WholesaleSalesDocumentStatus } from '../entities/wholesale-sales-invoice.entity';

export class WholesaleSalesInvoiceItemDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string | null;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateWholesaleSalesInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string | null;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsEnum(WholesaleSalesDocumentStatus)
  documentStatus?: WholesaleSalesDocumentStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WholesaleSalesInvoiceItemDto)
  items!: WholesaleSalesInvoiceItemDto[];
}
