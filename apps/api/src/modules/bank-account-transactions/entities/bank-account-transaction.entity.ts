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

export enum BankAccountTransactionType {
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
  Transfer = 'transfer',
  Settlement = 'settlement',
  SupplierPaymentBank = 'supplier_payment_bank',
  ExpenseBank = 'expense_bank',
  SalesReceiptBank = 'sales_receipt_bank',
  RefundBank = 'refund_bank',
}

export enum BankAccountTransactionDirection {
  Incoming = 'incoming',
  Outgoing = 'outgoing',
}

@Entity('bank_account_transactions')
export class BankAccountTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'bank_account_id', type: 'uuid' })
  bankAccountId!: string;

  @ManyToOne(() => BankAccountEntity, (bankAccount) => bankAccount.transactions, { eager: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: BankAccountEntity;

  @Index()
  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate!: string;

  @Index()
  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: BankAccountTransactionType,
  })
  transactionType!: BankAccountTransactionType;

  @Index()
  @Column({
    type: 'enum',
    enum: BankAccountTransactionDirection,
  })
  direction!: BankAccountTransactionDirection;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: number;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => BranchEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity | null;

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
