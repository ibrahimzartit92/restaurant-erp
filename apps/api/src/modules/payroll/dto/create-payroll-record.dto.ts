import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsIn,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentAllocationDto } from '../../shared/payment-allocation.dto';

export class CreatePayrollRecordDto {
  @IsUUID()
  employeeId!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  payrollMonth!: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  payrollYear!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseSalary!: number;

  @IsOptional()
  @IsIn(['fixed_monthly', 'hourly'])
  payrollMode?: 'fixed_monthly' | 'hourly';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  workHours?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  extraHours?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  extraHourRate?: number;

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
  debtDeductionAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherDeductionAmount?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  netSalary!: number;

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
