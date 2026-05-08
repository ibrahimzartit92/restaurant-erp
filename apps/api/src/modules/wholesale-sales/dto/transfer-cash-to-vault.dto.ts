import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class TransferWholesaleCashToVaultDto {
  @IsUUID()
  drawerId!: string;

  @IsUUID()
  vaultId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  transferDate!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
