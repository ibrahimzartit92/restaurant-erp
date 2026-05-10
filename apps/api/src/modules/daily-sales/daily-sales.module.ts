import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { VaultTransactionEntity } from '../vaults/entities/vault-transaction.entity';
import { VaultEntity } from '../vaults/entities/vault.entity';
import { DailySalesController } from './daily-sales.controller';
import { DailySalesClosingService } from './daily-sales-closing.service';
import { DailySalesService } from './daily-sales.service';
import { DailySaleEntity } from './entities/daily-sale.entity';
import { DailySalesClosingEntity } from './entities/daily-sales-closing.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      BranchEntity,
      DailySaleEntity,
      DailySalesClosingEntity,
      DrawerEntity,
      DrawerTransactionEntity,
      ExpenseEntity,
      VaultEntity,
      VaultTransactionEntity,
    ]),
  ],
  controllers: [DailySalesController],
  providers: [DailySalesService, DailySalesClosingService],
  exports: [DailySalesService, DailySalesClosingService],
})
export class DailySalesModule {}
