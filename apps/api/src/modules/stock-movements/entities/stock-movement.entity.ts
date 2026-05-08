import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ItemEntity } from '../../items/entities/item.entity';
import { UnitEntity } from '../../units/entities/unit.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

export enum StockMovementType {
  PurchaseIn = 'purchase_in',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out',
  ManualIn = 'manual_in',
  ManualOut = 'manual_out',
  WholesaleSaleOut = 'wholesale_sale_out',
  StockCountAdjustment = 'stock_count_adjustment',
}

@Entity('stock_movements')
@Index(['warehouseId', 'itemId', 'movementDate'])
@Index(['sourceType', 'sourceId'])
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'movement_date', type: 'date' })
  movementDate!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId!: string | null;

  @ManyToOne(() => UnitEntity, { nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: UnitEntity | null;

  @Column({ name: 'movement_type', type: 'enum', enum: StockMovementType })
  movementType!: StockMovementType;

  @Column({ name: 'quantity_in', type: 'numeric', precision: 12, scale: 3, transformer: numericTransformer })
  quantityIn!: number;

  @Column({ name: 'quantity_out', type: 'numeric', precision: 12, scale: 3, transformer: numericTransformer })
  quantityOut!: number;

  @Column({ name: 'balance_after', type: 'numeric', precision: 12, scale: 3, transformer: numericTransformer })
  balanceAfter!: number;

  @Column({ name: 'source_type', type: 'varchar', length: 80 })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({ name: 'source_line_id', type: 'uuid', nullable: true })
  sourceLineId!: string | null;

  @Column({ name: 'reference_number', type: 'varchar', length: 120, nullable: true })
  referenceNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
