import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseCategoryEntity } from '../expense-categories/entities/expense-category.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { ExpenseTypeEntity } from './entities/expense-type.entity';
import { ExpenseTypesController } from './expense-types.controller';
import { ExpenseTypesService } from './expense-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseCategoryEntity, ExpenseEntity, ExpenseTypeEntity])],
  controllers: [ExpenseTypesController],
  providers: [ExpenseTypesService],
  exports: [ExpenseTypesService],
})
export class ExpenseTypesModule {}
