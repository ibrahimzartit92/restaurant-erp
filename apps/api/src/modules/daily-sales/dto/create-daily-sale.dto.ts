import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDailySaleDto {
  @IsUUID()
  branchId!: string;

  @IsDateString()
  salesDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashSalesAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bankSalesAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliverySalesAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  websiteSalesAmount!: number;

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
  notes?: string;
}
