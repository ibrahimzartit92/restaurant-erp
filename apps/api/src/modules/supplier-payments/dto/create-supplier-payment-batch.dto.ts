import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PaymentAllocationDto } from '../../shared/payment-allocation.dto';

export class CreateSupplierPaymentBatchDto {
  @IsUUID()
  @IsOptional()
  purchaseInvoiceId?: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  payments?: PaymentAllocationDto[];
}
