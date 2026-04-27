import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionType,
} from '../entities/bank-account-transaction.entity';

export class CreateBankAccountTransactionDto {
  @IsUUID()
  bankAccountId!: string;

  @IsDateString()
  transactionDate!: string;

  @IsEnum(BankAccountTransactionType)
  transactionType!: BankAccountTransactionType;

  @IsEnum(BankAccountTransactionDirection)
  direction!: BankAccountTransactionDirection;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  sourceType?: string | null;

  @IsUUID()
  @IsOptional()
  sourceId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  referenceNumber?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description!: string;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
