import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseTemplateEntity } from '../expense-templates/entities/expense-template.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { ExpenseCategoryEntity } from './entities/expense-category.entity';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseCategoryEntity, ExpenseEntity, ExpenseTemplateEntity])],
  controllers: [ExpenseCategoriesController],
  providers: [ExpenseCategoriesService],
  exports: [ExpenseCategoriesService],
})
export class ExpenseCategoriesModule {}
