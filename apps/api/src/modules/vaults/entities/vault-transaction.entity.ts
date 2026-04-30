import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BankAccountEntity } from '../../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { numericTransformer } from '../../expenses/expense-shared';
import { VaultEntity } from './vault.entity';

export enum VaultTransactionDirection {
  In = 'in',
  Out = 'out',
}

export enum VaultTransactionType {
  DepositFromDrawer = 'deposit_from_drawer',
  DepositFromBank = 'deposit_from_bank',
  ManualDeposit = 'manual_deposit',
  WithdrawalToBank = 'withdrawal_to_bank',
  ExpensePayment = 'expense_payment',
  SupplierPayment = 'supplier_payment',
  PayrollPayment = 'payroll_payment',
  FinancialReversal = 'financial_reversal',
  AdminWithdrawal = 'admin_withdrawal',
  ManualWithdrawal = 'manual_withdrawal',
  Settlement = 'settlement',
}

@Entity('vault_transactions')
export class VaultTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'vault_id', type: 'uuid' })
  vaultId!: string;

  @ManyToOne(() => VaultEntity, (vault) => vault.transactions, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vault_id' })
  vault!: VaultEntity;

  @Index()
  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate!: string;

  @Index()
  @Column({ name: 'transaction_type', type: 'enum', enum: VaultTransactionType })
  transactionType!: VaultTransactionType;

  @Index()
  @Column({ type: 'enum', enum: VaultTransactionDirection })
  direction!: VaultTransactionDirection;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => BranchEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity | null;

  @Column({ name: 'drawer_id', type: 'uuid', nullable: true })
  drawerId!: string | null;

  @ManyToOne(() => DrawerEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'drawer_id' })
  drawer!: DrawerEntity | null;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId!: string | null;

  @ManyToOne(() => BankAccountEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: BankAccountEntity | null;

  @Column({ name: 'source_type', type: 'varchar', length: 80, nullable: true })
  sourceType!: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({ name: 'reference_number', type: 'varchar', length: 120, nullable: true })
  referenceNumber!: string | null;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
