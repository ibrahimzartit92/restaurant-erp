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
import { ExpenseCategoryEntity } from '../../expense-categories/entities/expense-category.entity';
import { ExpenseTemplateEntity } from '../../expense-templates/entities/expense-template.entity';
import { ExpenseTypeEntity } from '../../expense-types/entities/expense-type.entity';
import { ExpensePaymentMethod, numericTransformer } from '../expense-shared';
import { FinancialPaymentMethod } from '../../shared/payment-allocation.dto';

export { ExpensePaymentMethod, numericTransformer };

export type ExpensePaymentAllocation = {
  paymentMethod: FinancialPaymentMethod;
  drawerId?: string | null;
  bankAccountId?: string | null;
  vaultId?: string | null;
  amount: number;
  paymentDate?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
};

export enum ExpensePaymentStatus {
  Unpaid = 'unpaid',
  PartiallyPaid = 'partially_paid',
  Paid = 'paid',
}

@Entity('expenses')
export class ExpenseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'expense_number', type: 'varchar', length: 50, unique: true })
  expenseNumber!: string;

  @Index()
  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Index()
  @Column({ name: 'expense_category_id', type: 'uuid' })
  expenseCategoryId!: string;

  @ManyToOne(() => ExpenseCategoryEntity, (category) => category.expenses, { eager: true })
  @JoinColumn({ name: 'expense_category_id' })
  expenseCategory!: ExpenseCategoryEntity;

  @Index()
  @Column({ name: 'expense_type_id', type: 'uuid', nullable: true })
  expenseTypeId!: string | null;

  @ManyToOne(() => ExpenseTypeEntity, (expenseType) => expenseType.expenses, { eager: true, nullable: true })
  @JoinColumn({ name: 'expense_type_id' })
  expenseType!: ExpenseTypeEntity | null;

  @Index()
  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({
    name: 'paid_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  paidAmount!: number;

  @Column({
    name: 'remaining_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  remainingAmount!: number;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ExpensePaymentStatus,
    enumName: 'expense_payment_status_enum',
    default: ExpensePaymentStatus.Unpaid,
  })
  paymentStatus!: ExpensePaymentStatus;

  @Column({ name: 'payment_method', type: 'enum', enum: ExpensePaymentMethod })
  paymentMethod!: ExpensePaymentMethod;

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

  @Column({ name: 'vault_id', type: 'uuid', nullable: true })
  vaultId!: string | null;

  @Column({ name: 'payment_allocations', type: 'jsonb', nullable: true })
  paymentAllocations!: ExpensePaymentAllocation[] | null;

  @Column({ name: 'is_fixed', type: 'boolean', default: false })
  isFixed!: boolean;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null;

  @ManyToOne(() => ExpenseTemplateEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'template_id' })
  template!: ExpenseTemplateEntity | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
