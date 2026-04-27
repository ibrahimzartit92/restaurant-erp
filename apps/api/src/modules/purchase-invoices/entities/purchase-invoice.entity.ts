import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { SupplierRepresentativeEntity } from '../../supplier-representatives/entities/supplier-representative.entity';
import { SupplierPaymentEntity } from '../../supplier-payments/entities/supplier-payment.entity';
import { SupplierEntity } from '../../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { PurchaseInvoiceItemEntity } from '../../purchase-invoice-items/entities/purchase-invoice-item.entity';

export enum PurchaseInvoiceStatus {
  Draft = 'draft',
  Open = 'open',
  PartiallyPaid = 'partially_paid',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('purchase_invoices')
export class PurchaseInvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'invoice_number', type: 'varchar', length: 50, unique: true })
  invoiceNumber!: string;

  @Index()
  @Column({ name: 'invoice_label', type: 'varchar', length: 180, nullable: true })
  invoiceLabel!: string | null;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Index()
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, { eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Index()
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId!: string | null;

  @ManyToOne(() => SupplierEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: SupplierEntity | null;

  @Column({ name: 'supplier_representative_id', type: 'uuid', nullable: true })
  supplierRepresentativeId!: string | null;

  @ManyToOne(() => SupplierRepresentativeEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'supplier_representative_id' })
  supplierRepresentative!: SupplierRepresentativeEntity | null;

  @Index()
  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate!: string;

  @Index()
  @Column({ type: 'enum', enum: PurchaseInvoiceStatus, default: PurchaseInvoiceStatus.Open })
  status!: PurchaseInvoiceStatus;

  @Column({
    name: 'subtotal_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  subtotalAmount!: number;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  discountAmount!: number;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalAmount!: number;

  @Column({
    name: 'paid_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  paidAmount!: number;

  @Column({
    name: 'remaining_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  remainingAmount!: number;

  @Column({ name: 'is_miscellaneous', type: 'boolean', default: false })
  isMiscellaneous!: boolean;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ name: 'last_payment_date', type: 'date', nullable: true })
  lastPaymentDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => PurchaseInvoiceItemEntity, (item) => item.purchaseInvoice)
  items!: PurchaseInvoiceItemEntity[];

  @OneToMany(() => SupplierPaymentEntity, (payment) => payment.purchaseInvoice)
  payments!: SupplierPaymentEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
