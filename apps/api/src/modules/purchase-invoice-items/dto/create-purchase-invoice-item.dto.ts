import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePurchaseInvoiceItemDto {
  @IsUUID()
  purchaseInvoiceId!: string;

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
  @IsNotEmpty()
  @IsOptional()
  notes?: string;
}
