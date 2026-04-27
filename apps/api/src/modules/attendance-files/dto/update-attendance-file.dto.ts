import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateAttendanceFileDto {
  @IsOptional()
  @Transform(({ value }) => (value ? value : undefined))
  @IsUUID()
  employeeId?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value ? value : undefined))
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? value : undefined))
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
