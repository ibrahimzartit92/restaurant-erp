import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SettingsModule } from '../settings/settings.module';
import { VaultTransactionEntity } from '../vaults/entities/vault-transaction.entity';
import { VaultEntity } from '../vaults/entities/vault.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    SettingsModule,
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      BranchEntity,
      DailySaleEntity,
      ExpenseEntity,
      PayrollRecordEntity,
      PurchaseInvoiceEntity,
      VaultEntity,
      VaultTransactionEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
