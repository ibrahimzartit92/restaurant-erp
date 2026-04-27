import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSupplierRepresentativeDto {
  @IsUUID()
  supplierId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
