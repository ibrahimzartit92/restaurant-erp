import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { BranchesModule } from '../branches/branches.module';
import { BankAccountTransactionEntity } from './entities/bank-account-transaction.entity';
import { BankAccountTransactionsController } from './bank-account-transactions.controller';
import { BankAccountTransactionsService } from './bank-account-transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankAccountTransactionEntity]),
    BankAccountsModule,
    BranchesModule,
  ],
  controllers: [BankAccountTransactionsController],
  providers: [BankAccountTransactionsService],
  exports: [BankAccountTransactionsService],
})
export class BankAccountTransactionsModule {}
