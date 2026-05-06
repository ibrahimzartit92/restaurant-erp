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
import { DailySalesService } from './daily-sales.service';
import { DailySaleEntity } from './entities/daily-sale.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      BranchEntity,
      DailySaleEntity,
      DrawerEntity,
      DrawerTransactionEntity,
      VaultEntity,
      VaultTransactionEntity,
    ]),
  ],
  controllers: [DailySalesController],
  providers: [DailySalesService],
  exports: [DailySalesService],
})
export class DailySalesModule {}
