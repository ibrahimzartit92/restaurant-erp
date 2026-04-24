import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { StockCountItemEntity } from './stock-count-item.entity';

export enum StockCountStatus {
  Draft = 'draft',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Entity('stock_counts')
export class StockCountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'count_number', type: 'varchar', length: 50, unique: true })
  countNumber!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, { eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ name: 'count_date', type: 'date' })
  countDate!: string;

  @Column({
    type: 'enum',
    enum: StockCountStatus,
    default: StockCountStatus.Completed,
  })
  status!: StockCountStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => StockCountItemEntity, (item) => item.stockCount, {
    cascade: true,
    eager: true,
  })
  items!: StockCountItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
