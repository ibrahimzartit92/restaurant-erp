import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateEmployeeDebtDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  debtDate?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsIn(['installment', 'manual'])
  repaymentMode?: 'installment' | 'manual';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  installmentStartMonth?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  installmentStartYear?: number | null;

  @IsOptional()
  @IsUUID()
  drawerId?: string | null;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  vaultId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
