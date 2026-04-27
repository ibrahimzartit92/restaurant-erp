import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { DrawerDailySessionStatus } from '../entities/drawer-daily-session.entity';

export class UpdateDrawerDailySessionDto {
  @IsUUID()
  @IsOptional()
  drawerId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsDateString()
  @IsOptional()
  sessionDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  openingBalance?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  closingBalance?: number | null;

  @IsEnum(DrawerDailySessionStatus)
  @IsOptional()
  status?: DrawerDailySessionStatus;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
