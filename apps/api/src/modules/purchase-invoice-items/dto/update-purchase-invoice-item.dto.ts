import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdatePurchaseInvoiceItemDto {
  @IsUUID()
  @IsOptional()
  itemId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  lineTotal?: number;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
