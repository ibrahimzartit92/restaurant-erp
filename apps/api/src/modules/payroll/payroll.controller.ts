import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePayrollRecordDto } from './dto/create-payroll-record.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { PayrollService } from './payroll.service';

@Controller('payrolls')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('employee_id') employeeId?: string,
    @Query('payroll_month') payrollMonth?: string,
    @Query('payroll_year') payrollYear?: string,
  ) {
    return this.payrollService.findAll({
      search,
      employeeId,
      payrollMonth,
      payrollYear,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payrollService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDto: CreatePayrollRecordDto) {
    return this.payrollService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePayrollRecordDto) {
    return this.payrollService.update(id, updateDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('reverse_financial_effect') reverseFinancialEffect?: string,
    @Query('vault_id') vaultId?: string,
  ) {
    return this.payrollService.remove(id, reverseFinancialEffect === 'true', vaultId);
  }
}
