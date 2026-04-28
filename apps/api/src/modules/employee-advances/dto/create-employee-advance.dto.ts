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

export class CreateEmployeeAdvanceDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  advanceDate!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsUUID()
  drawerId?: string | null;

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
