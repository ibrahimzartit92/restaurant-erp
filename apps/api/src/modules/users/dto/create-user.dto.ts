import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  username!: string;

  @ValidateIf((object) => object.email !== null && object.email !== undefined && object.email !== '')
  @MaxLength(180)
  @IsEmail()
  email?: string | null;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsUUID()
  roleId!: string;

  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
