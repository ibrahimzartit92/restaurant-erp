import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpenseTypeEntity } from '../../expense-types/entities/expense-type.entity';
import { ExpenseTemplateEntity } from '../../expense-templates/entities/expense-template.entity';
import { ExpenseEntity } from '../../expenses/entities/expense.entity';

export enum ExpenseCategoryClassification {
  Operating = 'operating',
  Miscellaneous = 'miscellaneous',
}

@Entity('expense_categories')
export class ExpenseCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 160, unique: true })
  name!: string;

  @Column({ name: 'is_fixed', type: 'boolean', default: false })
  isFixed!: boolean;

  @Column({
    type: 'enum',
    enum: ExpenseCategoryClassification,
    enumName: 'expense_category_classification_enum',
    default: ExpenseCategoryClassification.Miscellaneous,
  })
  classification!: ExpenseCategoryClassification;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => ExpenseTypeEntity, (expenseType) => expenseType.category)
  expenseTypes!: ExpenseTypeEntity[];

  @OneToMany(() => ExpenseTemplateEntity, (template) => template.expenseCategory)
  templates!: ExpenseTemplateEntity[];

  @OneToMany(() => ExpenseEntity, (expense) => expense.expenseCategory)
  expenses!: ExpenseEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
