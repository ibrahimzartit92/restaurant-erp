import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ReconcileDrawerDailySessionDto {
  @IsUUID()
  drawerId!: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  sessionDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualCashAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  cashFloat?: number;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
