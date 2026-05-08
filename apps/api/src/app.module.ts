import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AttendanceFilesModule } from './modules/attendance-files/attendance-files.module';
import { AuthModule } from './modules/auth/auth.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { BankAccountTransactionsModule } from './modules/bank-account-transactions/bank-account-transactions.module';
import { BranchesModule } from './modules/branches/branches.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DailySalesModule } from './modules/daily-sales/daily-sales.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DrawerDailySessionsModule } from './modules/drawer-daily-sessions/drawer-daily-sessions.module';
import { DrawerTransactionsModule } from './modules/drawer-transactions/drawer-transactions.module';
import { DrawersModule } from './modules/drawers/drawers.module';
import { EmployeeAdvancesModule } from './modules/employee-advances/employee-advances.module';
import { EmployeePenaltiesModule } from './modules/employee-penalties/employee-penalties.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { ExpenseTemplatesModule } from './modules/expense-templates/expense-templates.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ItemCategoriesModule } from './modules/item-categories/item-categories.module';
import { ItemsModule } from './modules/items/items.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PurchaseInvoiceItemsModule } from './modules/purchase-invoice-items/purchase-invoice-items.module';
import { PurchaseInvoicesModule } from './modules/purchase-invoices/purchase-invoices.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StockCountsModule } from './modules/stock-counts/stock-counts.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { SupplierRepresentativesModule } from './modules/supplier-representatives/supplier-representatives.module';
import { SupplierPaymentsModule } from './modules/supplier-payments/supplier-payments.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { UnitsModule } from './modules/units/units.module';
import { UndoActionsModule } from './modules/undo-actions/undo-actions.module';
import { UsersModule } from './modules/users/users.module';
import { VaultsModule } from './modules/vaults/vaults.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { WholesaleSalesModule } from './modules/wholesale-sales/wholesale-sales.module';

@Module({
  imports: [
    DatabaseModule,
    AttachmentsModule,
    AttendanceFilesModule,
    AuthModule,
    BankAccountsModule,
    BankAccountTransactionsModule,
    BranchesModule,
    BootstrapModule,
    CustomersModule,
    DashboardModule,
    DailySalesModule,
    DrawerDailySessionsModule,
    DrawerTransactionsModule,
    DrawersModule,
    EmployeeAdvancesModule,
    EmployeePenaltiesModule,
    EmployeesModule,
    ExpenseCategoriesModule,
    ExpenseTemplatesModule,
    ExpensesModule,
    ItemCategoriesModule,
    ItemsModule,
    NotificationsModule,
    PayrollModule,
    PermissionsModule,
    PurchaseInvoiceItemsModule,
    PurchaseInvoicesModule,
    PurchasesModule,
    ReportsModule,
    RolesModule,
    SettingsModule,
    StockCountsModule,
    StockMovementsModule,
    SupplierRepresentativesModule,
    SupplierPaymentsModule,
    SuppliersModule,
    TransfersModule,
    UnitsModule,
    UndoActionsModule,
    UsersModule,
    VaultsModule,
    WarehousesModule,
    WholesaleSalesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
