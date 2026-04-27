import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseDrawerDailySessionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  closingBalance!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
