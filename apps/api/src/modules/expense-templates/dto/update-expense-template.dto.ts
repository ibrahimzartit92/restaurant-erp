import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ExpensePaymentMethod } from '../../expenses/expense-shared';

export class UpdateExpenseTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(180)
  name?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @IsUUID()
  @IsOptional()
  expenseCategoryId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultAmount?: number;

  @IsEnum(ExpensePaymentMethod)
  @IsOptional()
  paymentMethod?: ExpensePaymentMethod;

  @IsUUID()
  @IsOptional()
  drawerId?: string | null;

  @IsUUID()
  @IsOptional()
  bankAccountId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
