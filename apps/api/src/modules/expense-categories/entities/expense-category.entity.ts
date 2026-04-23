import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpenseTemplateEntity } from '../../expense-templates/entities/expense-template.entity';
import { ExpenseEntity } from '../../expenses/entities/expense.entity';

@Entity('expense_categories')
export class ExpenseCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 160, unique: true })
  name!: string;

  @Column({ name: 'is_fixed', type: 'boolean', default: false })
  isFixed!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => ExpenseTemplateEntity, (template) => template.expenseCategory)
  templates!: ExpenseTemplateEntity[];

  @OneToMany(() => ExpenseEntity, (expense) => expense.expenseCategory)
  expenses!: ExpenseEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
