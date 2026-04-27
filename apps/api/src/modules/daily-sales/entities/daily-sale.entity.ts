import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { numericTransformer } from '../../expenses/expense-shared';

@Entity('daily_sales')
@Unique('uq_daily_sales_branch_date', ['branchId', 'salesDate'])
export class DailySaleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Index()
  @Column({ name: 'sales_date', type: 'date' })
  salesDate!: string;

  @Column({
    name: 'cash_sales_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  cashSalesAmount!: number;

  @Column({
    name: 'bank_sales_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  bankSalesAmount!: number;

  @Column({
    name: 'delivery_sales_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  deliverySalesAmount!: number;

  @Column({
    name: 'website_sales_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  websiteSalesAmount!: number;

  @Column({
    name: 'tips_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  tipsAmount!: number;

  @Column({
    name: 'sales_return_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  salesReturnAmount!: number;

  @Column({
    name: 'net_sales_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  netSalesAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
