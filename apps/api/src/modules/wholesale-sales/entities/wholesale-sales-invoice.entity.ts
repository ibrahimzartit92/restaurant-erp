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
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { WholesaleSalesInvoiceItemEntity } from './wholesale-sales-invoice-item.entity';
import { WholesaleSalesPaymentEntity } from './wholesale-sales-payment.entity';

export enum WholesaleSalesDocumentStatus {
  Draft = 'draft',
  Approved = 'approved',
  Cancelled = 'cancelled',
}

export enum WholesaleSalesPaymentStatus {
  Unpaid = 'unpaid',
  PartiallyPaid = 'partially_paid',
  Paid = 'paid',
}

export const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('wholesale_sales_invoices')
export class WholesaleSalesInvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'invoice_number', type: 'varchar', length: 50, unique: true })
  invoiceNumber!: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerEntity, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

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
  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate!: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Index()
  @Column({ name: 'document_status', type: 'enum', enum: WholesaleSalesDocumentStatus, default: WholesaleSalesDocumentStatus.Draft })
  documentStatus!: WholesaleSalesDocumentStatus;

  @Index()
  @Column({ name: 'payment_status', type: 'enum', enum: WholesaleSalesPaymentStatus, default: WholesaleSalesPaymentStatus.Unpaid })
  paymentStatus!: WholesaleSalesPaymentStatus;

  @Column({ name: 'subtotal_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  subtotalAmount!: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  discountAmount!: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  totalAmount!: number;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  paidAmount!: number;

  @Column({ name: 'remaining_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  remainingAmount!: number;

  @Column({ name: 'cash_transferred_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  cashTransferredAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => WholesaleSalesInvoiceItemEntity, (item) => item.invoice)
  items!: WholesaleSalesInvoiceItemEntity[];

  @OneToMany(() => WholesaleSalesPaymentEntity, (payment) => payment.invoice)
  payments!: WholesaleSalesPaymentEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
