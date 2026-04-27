import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccountEntity } from './entities/bank-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BankAccountEntity, BankAccountTransactionEntity])],
  controllers: [BankAccountsController],
  providers: [BankAccountsService],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}
