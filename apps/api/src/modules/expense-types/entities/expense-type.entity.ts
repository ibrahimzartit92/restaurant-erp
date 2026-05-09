import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ExpenseCategoryEntity } from '../../expense-categories/entities/expense-category.entity';
import { ExpenseEntity } from '../../expenses/entities/expense.entity';

@Entity('expense_types')
@Index(['categoryId', 'name'], { unique: true })
@Index(['categoryId', 'code'], { unique: true })
export class ExpenseTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => ExpenseCategoryEntity, (category) => category.expenseTypes, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category!: ExpenseCategoryEntity;

  @Index()
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => ExpenseEntity, (expense) => expense.expenseType)
  expenses!: ExpenseEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
