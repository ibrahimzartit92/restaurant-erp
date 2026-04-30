import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensePaymentMethod } from './expense-shared';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('branch_id') branchId?: string,
    @Query('category_id') categoryId?: string,
    @Query('payment_method') paymentMethod?: ExpensePaymentMethod,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.expensesService.findAll({ search, branchId, categoryId, paymentMethod, dateFrom, dateTo });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(createExpenseDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('reverse_financial_effect') reverseFinancialEffect?: string,
    @Query('vault_id') vaultId?: string,
  ) {
    return this.expensesService.remove(id, reverseFinancialEffect === 'true', vaultId);
  }
}
