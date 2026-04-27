import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../drawer-daily-sessions/entities/drawer-daily-session.entity';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { StockCountEntity } from '../stock-counts/entities/stock-count.entity';
import { SupplierPaymentEntity } from '../supplier-payments/entities/supplier-payment.entity';
import { TransferEntity } from '../transfers/entities/transfer.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountTransactionEntity,
      DailySaleEntity,
      DrawerDailySessionEntity,
      EmployeeAdvanceEntity,
      EmployeePenaltyEntity,
      ExpenseEntity,
      PayrollRecordEntity,
      PurchaseInvoiceEntity,
      StockCountEntity,
      SupplierPaymentEntity,
      TransferEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
