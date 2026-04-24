import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDrawerDailySessionDto {
  @IsUUID()
  drawerId!: string;

  @IsUUID()
  branchId!: string;

  @IsDateString()
  sessionDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingBalance!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
