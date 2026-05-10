import { IsDateString, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpsertDailySalesClosingDto {
  @IsUUID()
  branchId!: string;

  @IsDateString()
  closingDate!: string;

  @IsOptional()
  @IsUUID()
  drawerId?: string | null;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  currentStep?: number;

  @IsOptional()
  @IsObject()
  draftData?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
