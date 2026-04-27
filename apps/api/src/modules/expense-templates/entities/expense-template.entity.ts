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
import { ExpensePaymentMethod, numericTransformer } from '../../expenses/expense-shared';

@Entity('expense_templates')
export class ExpenseTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => BranchEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity | null;

  @Index()
  @Column({ name: 'expense_category_id', type: 'uuid' })
  expenseCategoryId!: string;

  @ManyToOne(() => ExpenseCategoryEntity, (category) => category.templates, { eager: true })
  @JoinColumn({ name: 'expense_category_id' })
  expenseCategory!: ExpenseCategoryEntity;

  @Column({
    name: 'default_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  defaultAmount!: number;

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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
