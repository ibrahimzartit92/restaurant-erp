import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ItemEntity } from '../../items/entities/item.entity';
import { TransferEntity } from './transfer.entity';

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('branch_transfer_items')
export class BranchTransferItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_transfer_id', type: 'uuid' })
  branchTransferId!: string;

  @ManyToOne(() => TransferEntity, (transfer) => transfer.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_transfer_id' })
  transfer!: TransferEntity;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity!: number;

  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  unitCost!: number;

  @Column({
    name: 'line_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  lineTotal!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
