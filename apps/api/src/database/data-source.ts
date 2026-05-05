import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { InitialAuthAccessFoundation1730000000000 } from './migrations/1730000000000-initial-auth-access-foundation';
import { InventorySupplierMasterData1730000001000 } from './migrations/1730000001000-inventory-supplier-master-data';
import { PurchasingCore1730000002000 } from './migrations/1730000002000-purchasing-core';
import { FinanceCore1730000003000 } from './migrations/1730000003000-finance-core';
import { CashDrawerCore1730000004000 } from './migrations/1730000004000-cash-drawer-core';
import { AccessControlManagement1730000005000 } from './migrations/1730000005000-access-control-management';
import { BankAccountTransactions1730000006000 } from './migrations/1730000006000-bank-account-transactions';
import { BranchTransfers1730000007000 } from './migrations/1730000007000-branch-transfers';
import { StockCounts1730000008000 } from './migrations/1730000008000-stock-counts';
import { EmployeesPayrollAttendance1730000009000 } from './migrations/1730000009000-employees-payroll-attendance';
import { SystemSettings1730000010000 } from './migrations/1730000010000-system-settings';
import { Attachments1730000011000 } from './migrations/1730000011000-attachments';
import { DailySalesFinancialLinks1730000012000 } from './migrations/1730000012000-daily-sales-financial-links';
import { BankAccountOpeningBalance1730000013000 } from './migrations/1730000013000-bank-account-opening-balance';
import { DrawerDefaultFloat1730000014000 } from './migrations/1730000014000-drawer-default-float';
import { EmployeeAdvanceDrawerLink1730000015000 } from './migrations/1730000015000-employee-advance-drawer-link';
import { MultiPaymentReversals1730000016000 } from './migrations/1730000016000-multi-payment-reversals';
import { Vaults1730000017000 } from './migrations/1730000017000-vaults';
import { UnifiedPayrollPayments1730000018000 } from './migrations/1730000018000-unified-payroll-payments';
import { VaultLinkageSchemaRepair1730000019000 } from './migrations/1730000019000-vault-linkage-schema-repair';
import { PayrollDeductionLinks1730000020000 } from './migrations/1730000020000-payroll-deduction-links';
import { UndoActionsAndVaultReversal1730000021000 } from './migrations/1730000021000-undo-actions-and-vault-reversal';
import { MasterDataStabilization1730000022000 } from './migrations/1730000022000-master-data-stabilization';
import { StockMovements1730000023000 } from './migrations/1730000023000-stock-movements';
import { databaseEntities } from './typeorm-options';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: databaseEntities,
  migrations: [
    InitialAuthAccessFoundation1730000000000,
    InventorySupplierMasterData1730000001000,
    PurchasingCore1730000002000,
    FinanceCore1730000003000,
    CashDrawerCore1730000004000,
    AccessControlManagement1730000005000,
    BankAccountTransactions1730000006000,
    BranchTransfers1730000007000,
    StockCounts1730000008000,
    EmployeesPayrollAttendance1730000009000,
    SystemSettings1730000010000,
    Attachments1730000011000,
    DailySalesFinancialLinks1730000012000,
    BankAccountOpeningBalance1730000013000,
    DrawerDefaultFloat1730000014000,
    EmployeeAdvanceDrawerLink1730000015000,
    MultiPaymentReversals1730000016000,
    Vaults1730000017000,
    UnifiedPayrollPayments1730000018000,
    VaultLinkageSchemaRepair1730000019000,
    PayrollDeductionLinks1730000020000,
    UndoActionsAndVaultReversal1730000021000,
    MasterDataStabilization1730000022000,
    StockMovements1730000023000,
  ],
  synchronize: false,
});
