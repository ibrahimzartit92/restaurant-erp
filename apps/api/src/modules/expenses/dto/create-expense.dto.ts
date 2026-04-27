import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ExpensePaymentMethod } from '../expense-shared';

export class CreateExpenseDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  expenseNumber?: string;

  @IsDateString()
  expenseDate!: string;

  @IsUUID()
  branchId!: string;

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
  amount!: number;

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
  notes?: string;
}
