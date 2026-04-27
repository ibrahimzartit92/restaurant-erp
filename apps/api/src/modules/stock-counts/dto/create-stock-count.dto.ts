import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockCountStatus } from '../entities/stock-count.entity';

export class CreateStockCountItemDto {
  @IsUUID()
  itemId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  systemQuantity!: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  countedQuantity!: number;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateStockCountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  countNumber!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsDateString()
  countDate!: string;

  @IsOptional()
  @IsEnum(StockCountStatus)
  status?: StockCountStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockCountItemDto)
  items!: CreateStockCountItemDto[];
}
