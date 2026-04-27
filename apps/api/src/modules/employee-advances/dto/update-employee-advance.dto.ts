import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateEmployeeAdvanceDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  advanceDate?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  payrollMonth?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  payrollYear?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
