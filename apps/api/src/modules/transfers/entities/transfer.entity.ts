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
import { BranchTransferItemEntity } from './transfer-item.entity';

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

export enum BranchTransferStatus {
  Draft = 'draft',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Entity('branch_transfers')
export class TransferEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transfer_number', type: 'varchar', length: 50, unique: true })
  transferNumber!: string;

  @Column({ name: 'transfer_date', type: 'date' })
  transferDate!: string;

  @Column({ name: 'from_branch_id', type: 'uuid' })
  fromBranchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'from_branch_id' })
  fromBranch!: BranchEntity;

  @Column({ name: 'to_branch_id', type: 'uuid' })
  toBranchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'to_branch_id' })
  toBranch!: BranchEntity;

  @Column({ name: 'from_warehouse_id', type: 'uuid' })
  fromWarehouseId!: string;

  @ManyToOne(() => WarehouseEntity, { eager: true })
  @JoinColumn({ name: 'from_warehouse_id' })
  fromWarehouse!: WarehouseEntity;

  @Column({ name: 'to_warehouse_id', type: 'uuid' })
  toWarehouseId!: string;

  @ManyToOne(() => WarehouseEntity, { eager: true })
  @JoinColumn({ name: 'to_warehouse_id' })
  toWarehouse!: WarehouseEntity;

  @Column({
    type: 'enum',
    enum: BranchTransferStatus,
    default: BranchTransferStatus.Completed,
  })
  status!: BranchTransferStatus;

  @Column({
    name: 'total_cost_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalCostAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => BranchTransferItemEntity, (item) => item.transfer, {
    cascade: true,
    eager: true,
  })
  items!: BranchTransferItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
