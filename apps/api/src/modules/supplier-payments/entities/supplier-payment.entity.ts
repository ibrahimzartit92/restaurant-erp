import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BankAccountEntity } from '../../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { PurchaseInvoiceEntity } from '../../purchase-invoices/entities/purchase-invoice.entity';

export enum SupplierPaymentMethod {
  Cash = 'cash',
  Bank = 'bank',
  Other = 'other',
}

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('supplier_payments')
export class SupplierPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'payment_number', type: 'varchar', length: 50, unique: true })
  paymentNumber!: string;

  @Index()
  @Column({ name: 'purchase_invoice_id', type: 'uuid' })
  purchaseInvoiceId!: string;

  @ManyToOne(() => PurchaseInvoiceEntity, (invoice) => invoice.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_invoice_id' })
  purchaseInvoice!: PurchaseInvoiceEntity;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Index()
  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  @Column({ name: 'payment_method', type: 'enum', enum: SupplierPaymentMethod })
  paymentMethod!: SupplierPaymentMethod;

  @Column({ name: 'drawer_id', type: 'uuid', nullable: true })
  drawerId!: string | null;

  @ManyToOne(() => DrawerEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'drawer_id' })
  drawer!: DrawerEntity | null;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId!: string | null;

  @ManyToOne(() => BankAccountEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: BankAccountEntity | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'reference_number', type: 'varchar', length: 120, nullable: true })
  referenceNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
