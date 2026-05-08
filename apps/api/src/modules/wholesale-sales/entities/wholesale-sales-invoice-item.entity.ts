import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ItemEntity } from '../../items/entities/item.entity';
import { UnitEntity } from '../../units/entities/unit.entity';
import { numericTransformer, WholesaleSalesInvoiceEntity } from './wholesale-sales-invoice.entity';

@Entity('wholesale_sales_invoice_items')
export class WholesaleSalesInvoiceItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId!: string;

  @ManyToOne(() => WholesaleSalesInvoiceEntity, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: WholesaleSalesInvoiceEntity;

  @Index()
  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId!: string | null;

  @ManyToOne(() => UnitEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: UnitEntity | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, transformer: numericTransformer })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  unitPrice!: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  lineTotal!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
