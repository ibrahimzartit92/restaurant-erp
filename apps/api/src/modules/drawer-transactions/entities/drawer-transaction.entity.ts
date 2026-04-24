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
import { BranchEntity } from '../../branches/entities/branch.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { numericTransformer } from '../../expenses/expense-shared';

export enum DrawerTransactionDirection {
  In = 'in',
  Out = 'out',
}

export enum DrawerTransactionType {
  DailyCashSales = 'daily_cash_sales',
  SupplierPaymentCash = 'supplier_payment_cash',
  ExpenseCash = 'expense_cash',
  SalesReturnCash = 'sales_return_cash',
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
  Settlement = 'settlement',
  Transfer = 'transfer',
}

@Entity('drawer_transactions')
export class DrawerTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'drawer_id', type: 'uuid' })
  drawerId!: string;

  @ManyToOne(() => DrawerEntity, { eager: true })
  @JoinColumn({ name: 'drawer_id' })
  drawer!: DrawerEntity;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Index()
  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate!: string;

  @Column({ name: 'transaction_type', type: 'enum', enum: DrawerTransactionType })
  transactionType!: DrawerTransactionType;

  @Column({ type: 'enum', enum: DrawerTransactionDirection })
  direction!: DrawerTransactionDirection;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'source_type', type: 'varchar', length: 80, nullable: true })
  sourceType!: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({ type: 'varchar', length: 240 })
  description!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
