import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { DailySalesModule } from '../daily-sales/daily-sales.module';
import { ExpenseCategoryEntity } from '../expense-categories/entities/expense-category.entity';
import { ExpenseTemplateEntity } from '../expense-templates/entities/expense-template.entity';
import { ExpenseTypeEntity } from '../expense-types/entities/expense-type.entity';
import { UndoActionsModule } from '../undo-actions/undo-actions.module';
import { VaultsModule } from '../vaults/vaults.module';
import { ExpenseEntity } from './entities/expense.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [
    UndoActionsModule,
    VaultsModule,
    DailySalesModule,
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      BranchEntity,
      DrawerTransactionEntity,
      DrawerEntity,
      ExpenseCategoryEntity,
      ExpenseEntity,
      ExpenseTemplateEntity,
      ExpenseTypeEntity,
    ]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
