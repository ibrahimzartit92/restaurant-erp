import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(50)
  employeeNumber!: string;

  @IsString()
  @MaxLength(180)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string | null;

  @IsOptional()
  @IsUUID()
  defaultBranchId?: string | null;

  @IsOptional()
  @IsDateString()
  hireDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
