import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { ExpenseCategoryEntity } from '../expense-categories/entities/expense-category.entity';
import { ExpenseTemplateEntity } from './entities/expense-template.entity';
import { ExpenseTemplatesController } from './expense-templates.controller';
import { ExpenseTemplatesService } from './expense-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BranchEntity,
      DrawerEntity,
      ExpenseCategoryEntity,
      ExpenseTemplateEntity,
    ]),
  ],
  controllers: [ExpenseTemplatesController],
  providers: [ExpenseTemplatesService],
  exports: [ExpenseTemplatesService],
})
export class ExpenseTemplatesModule {}
