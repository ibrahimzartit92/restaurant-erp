import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExpenseCategoryClassification } from '../entities/expense-category.entity';

export class UpdateExpenseCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @IsIn(Object.values(ExpenseCategoryClassification))
  @IsOptional()
  classification?: ExpenseCategoryClassification;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
