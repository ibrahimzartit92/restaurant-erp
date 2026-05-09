import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { ReportsModule } from '../reports/reports.module';
import { SettingsModule } from '../settings/settings.module';
import { VaultsModule } from '../vaults/vaults.module';
import { WholesaleSalesModule } from '../wholesale-sales/wholesale-sales.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    SettingsModule,
    ReportsModule,
    WholesaleSalesModule,
    BankAccountsModule,
    VaultsModule,
    TypeOrmModule.forFeature([
      BranchEntity,
      DailySaleEntity,
      EmployeeAdvanceEntity,
      ExpenseEntity,
      PayrollRecordEntity,
      PurchaseInvoiceEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
