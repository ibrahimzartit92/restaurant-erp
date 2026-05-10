import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateObligationRepaymentDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(['advance', 'debt', 'financial_penalty'])
  obligationKind!: 'advance' | 'debt' | 'financial_penalty';

  @IsUUID()
  obligationId!: string;

  @IsDateString()
  repaymentDate!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

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
  @MaxLength(120)
  referenceNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
