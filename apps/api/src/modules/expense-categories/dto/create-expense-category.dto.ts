import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
