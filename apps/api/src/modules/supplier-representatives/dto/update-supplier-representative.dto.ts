import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateSupplierRepresentativeDto {
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string | null;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
