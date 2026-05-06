import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateDailySaleDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsDateString()
  @IsOptional()
  salesDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  cashSalesAmount?: number;

  @IsUUID()
  @IsOptional()
  drawerId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  bankSalesAmount?: number;

  @IsUUID()
  @IsOptional()
  bankAccountId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  deliverySalesAmount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  websiteSalesAmount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  tipsAmount?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  salesReturnAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsUUID()
  @IsOptional()
  vaultTransferVaultId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  vaultTransferAmount?: number;

  @IsString()
  @IsOptional()
  vaultTransferNotes?: string | null;
}
