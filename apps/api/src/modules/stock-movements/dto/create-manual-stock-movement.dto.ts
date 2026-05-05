import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { StockMovementType } from '../entities/stock-movement.entity';

export class CreateManualStockMovementDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  itemId!: string;

  @IsDateString()
  movementDate!: string;

  @IsEnum(StockMovementType)
  movementType!: StockMovementType.ManualIn | StockMovementType.ManualOut;

  @IsNumber({ maxDecimalPlaces: 3 })
  quantity!: number;

  @IsString()
  @MaxLength(160)
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
