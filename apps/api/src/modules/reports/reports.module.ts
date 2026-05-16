import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../drawer-daily-sessions/entities/drawer-daily-session.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeeDebtEntity } from '../employee-financial-obligations/entities/employee-debt.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { ItemCategoryEntity } from '../item-categories/entities/item-category.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { StockCountEntity } from '../stock-counts/entities/stock-count.entity';
import { SettingsModule } from '../settings/settings.module';
import { SupplierPaymentEntity } from '../supplier-payments/entities/supplier-payment.entity';
import { TransferEntity } from '../transfers/entities/transfer.entity';
import { VaultTransactionEntity } from '../vaults/entities/vault-transaction.entity';
import { WholesaleSalesModule } from '../wholesale-sales/wholesale-sales.module';
import { ReportExportService } from './report-export.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    SettingsModule,
    WholesaleSalesModule,
    TypeOrmModule.forFeature([
      BankAccountTransactionEntity,
      BranchEntity,
      DailySaleEntity,
      DrawerDailySessionEntity,
      DrawerTransactionEntity,
      EmployeeAdvanceEntity,
      EmployeeDebtEntity,
      EmployeePenaltyEntity,
      ExpenseEntity,
      ItemCategoryEntity,
      PayrollRecordEntity,
      PurchaseInvoiceEntity,
      StockCountEntity,
      SupplierPaymentEntity,
      TransferEntity,
      VaultTransactionEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportExportService],
  exports: [ReportExportService],
})
export class ReportsModule {}
