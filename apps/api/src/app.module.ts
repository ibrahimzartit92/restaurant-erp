import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AttendanceFilesModule } from './modules/attendance-files/attendance-files.module';
import { AuthModule } from './modules/auth/auth.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { BankAccountTransactionsModule } from './modules/bank-account-transactions/bank-account-transactions.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DailySalesModule } from './modules/daily-sales/daily-sales.module';
import { DrawerDailySessionsModule } from './modules/drawer-daily-sessions/drawer-daily-sessions.module';
import { DrawerTransactionsModule } from './modules/drawer-transactions/drawer-transactions.module';
import { DrawersModule } from './modules/drawers/drawers.module';
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
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SupplierRepresentativesModule } from './modules/supplier-representatives/supplier-representatives.module';
import { SupplierPaymentsModule } from './modules/supplier-payments/supplier-payments.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';

@Module({
  imports: [
    DatabaseModule,
    AttachmentsModule,
    AttendanceFilesModule,
    AuthModule,
    BankAccountsModule,
    BankAccountTransactionsModule,
    BranchesModule,
    DailySalesModule,
    DrawerDailySessionsModule,
    DrawerTransactionsModule,
    DrawersModule,
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
    RolesModule,
    SettingsModule,
    SupplierRepresentativesModule,
    SupplierPaymentsModule,
    SuppliersModule,
    TransfersModule,
    UnitsModule,
    UsersModule,
    WarehousesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
