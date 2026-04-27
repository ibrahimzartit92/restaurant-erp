import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateExpenseTemplateDto } from './dto/create-expense-template.dto';
import { UpdateExpenseTemplateDto } from './dto/update-expense-template.dto';
import { ExpenseTemplatesService } from './expense-templates.service';

@Controller('expense-templates')
export class ExpenseTemplatesController {
  constructor(private readonly expenseTemplatesService: ExpenseTemplatesService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('branch_id') branchId?: string) {
    return this.expenseTemplatesService.findAll(search, branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseTemplatesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createExpenseTemplateDto: CreateExpenseTemplateDto) {
    return this.expenseTemplatesService.create(createExpenseTemplateDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpenseTemplateDto: UpdateExpenseTemplateDto) {
    return this.expenseTemplatesService.update(id, updateExpenseTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseTemplatesService.remove(id);
  }
}
