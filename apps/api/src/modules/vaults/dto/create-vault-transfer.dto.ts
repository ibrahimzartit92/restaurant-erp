import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export enum VaultTransferKind {
  DepositFromDrawer = 'deposit_from_drawer',
  DepositFromBank = 'deposit_from_bank',
  ManualDeposit = 'manual_deposit',
  WithdrawalToBank = 'withdrawal_to_bank',
  PayrollPayment = 'payroll_payment',
  AdminWithdrawal = 'admin_withdrawal',
  ManualWithdrawal = 'manual_withdrawal',
  Settlement = 'settlement',
}

export class CreateVaultTransferDto {
  @IsEnum(VaultTransferKind)
  transferKind!: VaultTransferKind;

  @IsDateString()
  transactionDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @IsUUID()
  @IsOptional()
  drawerId?: string | null;

  @IsUUID()
  @IsOptional()
  bankAccountId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  referenceNumber?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;
}
