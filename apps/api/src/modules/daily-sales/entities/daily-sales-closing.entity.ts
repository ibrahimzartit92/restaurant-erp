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
import { BankAccountEntity } from '../../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { numericTransformer } from '../../expenses/expense-shared';

export enum DailySalesClosingStatus {
  Draft = 'draft',
  Finalized = 'finalized',
  Cancelled = 'cancelled',
}

export type DailySalesClosingDraftData = {
  deliverySales?: {
    enabled?: boolean;
    fromDate?: string | null;
    toDate?: string | null;
    amount?: number;
    bankAccountId?: string | null;
  };
  websiteSales?: {
    enabled?: boolean;
    fromDate?: string | null;
    toDate?: string | null;
    cashAmount?: number;
    bankAmount?: number;
    drawerId?: string | null;
    bankAccountId?: string | null;
  };
  inStoreCardSales?: {
    enabled?: boolean;
    amount?: number;
    bankAccountId?: string | null;
  };
  cashReconciliation?: {
    handedCashAmount?: number;
  };
  vaultTransfer?: {
    enabled?: boolean;
    amount?: number;
    vaultId?: string | null;
  };
  notes?: string | null;
};

export type DailySalesClosingSummary = {
  expensesAmount: number;
  purchasesAmount: number;
  drawerPaidExpensesAmount: number;
  bankPaidExpensesAmount: number;
  drawerPaidExpenses: DailySalesClosingSummaryLine[];
  bankPaidExpenses: DailySalesClosingSummaryLine[];
  drawerPaidPurchases: DailySalesClosingSummaryLine[];
  bankPaidPurchasesAmount: number;
  bankPaidPurchases: DailySalesClosingSummaryLine[];
  cashRetailSales: number;
  wholesaleCashCollections: number;
  wholesaleCashCollectionLines: DailySalesClosingSummaryLine[];
  wholesaleBankCollections: number;
  wholesaleBankCollectionLines: DailySalesClosingSummaryLine[];
  wholesaleCollectionsTotal: number;
  websiteCashSales: number;
  cashExpensesFromDrawer: number;
  cashPurchasesFromDrawer: number;
  employeeCashOutflowsFromDrawer: number;
  otherDrawerCashEffects: number;
  expectedSystemCash: number;
  handedCashAmount: number;
  cashDifference: number;
  normalBankSalesAmount: number;
  totalBankInflowsAmount: number;
  normalDailySalesAmount: number;
  totalDailyActivityAmount: number;
  reconciledTotalDailySales: number;
  deliverySalesAmount: number;
  websiteBankSalesAmount: number;
  inStoreCardSalesAmount: number;
  vaultTransferAmount: number;
};

export type DailySalesClosingSummaryLine = {
  id: string;
  description: string;
  amount: number;
  date?: string | null;
  reference?: string | null;
  secondary?: string | null;
};

@Entity('daily_sales_closings')
@Unique('uq_daily_sales_closings_branch_date', ['branchId', 'closingDate'])
export class DailySalesClosingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Index()
  @Column({ name: 'closing_date', type: 'date' })
  closingDate!: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: DailySalesClosingStatus.Draft })
  status!: DailySalesClosingStatus;

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

  @Column({ name: 'current_step', type: 'int', default: 1 })
  currentStep!: number;

  @Column({ name: 'draft_data', type: 'jsonb', nullable: true })
  draftData!: DailySalesClosingDraftData | null;

  @Column({ name: 'summary_values', type: 'jsonb', nullable: true })
  summaryValues!: DailySalesClosingSummary | null;

  @Column({ name: 'handed_cash_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  handedCashAmount!: number;

  @Column({ name: 'expected_cash_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  expectedCashAmount!: number;

  @Column({ name: 'cash_difference_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  cashDifferenceAmount!: number;

  @Column({ name: 'generated_daily_sale_id', type: 'uuid', nullable: true })
  generatedDailySaleId!: string | null;

  @Column({ name: 'generated_record_links', type: 'jsonb', nullable: true })
  generatedRecordLinks!: { type: string; id: string }[] | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
