import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PaymentAllocationDto } from '../../shared/payment-allocation.dto';

export class CreateSupplierPaymentBatchDto {
  @IsUUID()
  purchaseInvoiceId!: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  payments!: PaymentAllocationDto[];
}
