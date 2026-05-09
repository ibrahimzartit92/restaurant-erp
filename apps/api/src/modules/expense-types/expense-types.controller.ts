import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateExpenseTypeDto } from './dto/create-expense-type.dto';
import { UpdateExpenseTypeDto } from './dto/update-expense-type.dto';
import { ExpenseTypesService } from './expense-types.service';

@Controller('expense-types')
export class ExpenseTypesController {
  constructor(private readonly expenseTypesService: ExpenseTypesService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('category_id') categoryId?: string, @Query('active_only') activeOnly?: string) {
    return this.expenseTypesService.findAll({ search, categoryId, activeOnly: activeOnly === 'true' });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseTypesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseTypeDto) {
    return this.expenseTypesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseTypeDto) {
    return this.expenseTypesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseTypesService.remove(id);
  }

  @Post(':id/delete')
  removeViaPost(@Param('id') id: string) {
    return this.expenseTypesService.remove(id);
  }
}
