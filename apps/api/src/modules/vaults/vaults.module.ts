import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { VaultTransactionEntity } from './entities/vault-transaction.entity';
import { VaultEntity } from './entities/vault.entity';
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      DrawerEntity,
      DrawerTransactionEntity,
      VaultEntity,
      VaultTransactionEntity,
    ]),
  ],
  controllers: [VaultsController],
  providers: [VaultsService],
  exports: [VaultsService],
})
export class VaultsModule {}
