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
  ],
  synchronize: false,
});
