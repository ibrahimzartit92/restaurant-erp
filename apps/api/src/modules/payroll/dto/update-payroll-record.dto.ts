import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentAllocationDto } from '../../shared/payment-allocation.dto';

export class UpdatePayrollRecordDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  payrollMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  payrollYear?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  allowancesAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  advancesDeductionAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  penaltiesDeductionAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherDeductionAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  netSalary?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  @IsOptional()
  payments?: PaymentAllocationDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
