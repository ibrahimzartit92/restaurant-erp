import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ExpensePaymentMethod } from '../../expenses/expense-shared';

export class CreateExpenseTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @IsUUID()
  expenseCategoryId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultAmount!: number;

  @IsEnum(ExpensePaymentMethod)
  paymentMethod!: ExpensePaymentMethod;

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
  notes?: string;
}
