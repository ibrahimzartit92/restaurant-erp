import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategoriesService } from './expense-categories.service';

@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly expenseCategoriesService: ExpenseCategoriesService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.expenseCategoriesService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseCategoriesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createExpenseCategoryDto: CreateExpenseCategoryDto) {
    return this.expenseCategoriesService.create(createExpenseCategoryDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpenseCategoryDto: UpdateExpenseCategoryDto) {
    return this.expenseCategoriesService.update(id, updateExpenseCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseCategoriesService.remove(id);
  }
}
