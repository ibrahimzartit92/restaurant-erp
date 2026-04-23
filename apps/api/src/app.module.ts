import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AttendanceFilesModule } from './modules/attendance-files/attendance-files.module';
import { AuthModule } from './modules/auth/auth.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DailySalesModule } from './modules/daily-sales/daily-sales.module';
import { DrawersModule } from './modules/drawers/drawers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ItemCategoriesModule } from './modules/item-categories/item-categories.module';
import { ItemsModule } from './modules/items/items.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PayrollModule } from './modules/payroll/payroll.module';
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
    BranchesModule,
    DailySalesModule,
    DrawersModule,
    EmployeesModule,
    ExpensesModule,
    ItemCategoriesModule,
    ItemsModule,
    NotificationsModule,
    PayrollModule,
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
