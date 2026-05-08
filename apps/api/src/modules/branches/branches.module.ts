import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../drawer-daily-sessions/entities/drawer-daily-session.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeeEntity } from '../employees/entities/employee.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { VaultEntity } from '../vaults/entities/vault.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { BranchEntity } from './entities/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BranchEntity,
      BankAccountEntity,
      BankAccountTransactionEntity,
      DailySaleEntity,
      DrawerEntity,
      DrawerDailySessionEntity,
      DrawerTransactionEntity,
      EmployeeEntity,
      ExpenseEntity,
      PurchaseInvoiceEntity,
      VaultEntity,
      WarehouseEntity,
    ]),
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
