import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStockCountItemDto } from './create-stock-count.dto';
import { StockCountStatus } from '../entities/stock-count.entity';

export class UpdateStockCountDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  countNumber?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  countDate?: string;

  @IsOptional()
  @IsEnum(StockCountStatus)
  status?: StockCountStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockCountItemDto)
  items?: CreateStockCountItemDto[];
}
