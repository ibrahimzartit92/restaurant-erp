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
import { StockCountEntity } from './stock-count.entity';

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('stock_count_items')
export class StockCountItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'stock_count_id', type: 'uuid' })
  stockCountId!: string;

  @ManyToOne(() => StockCountEntity, (stockCount) => stockCount.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_count_id' })
  stockCount!: StockCountEntity;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({
    name: 'system_quantity',
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  systemQuantity!: number;

  @Column({
    name: 'counted_quantity',
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  countedQuantity!: number;

  @Column({
    name: 'difference_quantity',
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  differenceQuantity!: number;

  @Column({
    name: 'estimated_cost_difference',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  estimatedCostDifference!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
