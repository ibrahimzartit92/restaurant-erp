import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { ExpenseCategoryEntity } from '../expense-categories/entities/expense-category.entity';
import { ExpenseTemplateEntity } from '../expense-templates/entities/expense-template.entity';
import { ExpenseEntity } from './entities/expense.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BranchEntity,
      DrawerEntity,
      ExpenseCategoryEntity,
      ExpenseEntity,
      ExpenseTemplateEntity,
    ]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
