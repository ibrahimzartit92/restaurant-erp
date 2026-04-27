import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { DrawerTransactionDirection, DrawerTransactionType } from '../entities/drawer-transaction.entity';

export class UpdateDrawerTransactionDto {
  @IsUUID()
  @IsOptional()
  drawerId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @IsEnum(DrawerTransactionType)
  @IsOptional()
  transactionType?: DrawerTransactionType;

  @IsEnum(DrawerTransactionDirection)
  @IsOptional()
  direction?: DrawerTransactionDirection;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  sourceType?: string | null;

  @IsUUID()
  @IsOptional()
  sourceId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
