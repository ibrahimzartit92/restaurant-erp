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
import { CreateTransferItemDto } from './create-transfer.dto';
import { BranchTransferStatus } from '../entities/transfer.entity';

export class UpdateTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  transferNumber?: string;

  @IsOptional()
  @IsDateString()
  transferDate?: string;

  @IsOptional()
  @IsUUID()
  fromBranchId?: string;

  @IsOptional()
  @IsUUID()
  toBranchId?: string;

  @IsOptional()
  @IsUUID()
  fromWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  toWarehouseId?: string;

  @IsOptional()
  @IsEnum(BranchTransferStatus)
  status?: BranchTransferStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferItemDto)
  items?: CreateTransferItemDto[];
}
