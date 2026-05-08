import { IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWholesaleSalesPaymentDto } from './create-wholesale-sales-payment.dto';

export class CreateWholesaleSalesPaymentBatchDto {
  @IsUUID()
  invoiceId!: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWholesaleSalesPaymentDto)
  payments!: CreateWholesaleSalesPaymentDto[];

  @IsOptional()
  @IsString()
  notes?: string | null;
}
