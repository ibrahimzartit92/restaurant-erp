import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { DrawerTransactionDirection, DrawerTransactionType } from '../entities/drawer-transaction.entity';

export class CreateDrawerTransactionDto {
  @IsUUID()
  drawerId!: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  transactionDate!: string;

  @IsEnum(DrawerTransactionType)
  transactionType!: DrawerTransactionType;

  @IsEnum(DrawerTransactionDirection)
  direction!: DrawerTransactionDirection;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  sourceType?: string | null;

  @IsUUID()
  @IsOptional()
  sourceId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  description!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
