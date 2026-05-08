import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { WholesaleSalesDocumentStatus } from '../entities/wholesale-sales-invoice.entity';

export class UpdateWholesaleSalesInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string | null;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

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
}
