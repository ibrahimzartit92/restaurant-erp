import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ExpensePaymentMethod } from '../expense-shared';

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  expenseNumber?: string;

  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  expenseCategoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(180)
  title?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

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
  isFixed?: boolean;

  @IsUUID()
  @IsOptional()
  templateId?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
