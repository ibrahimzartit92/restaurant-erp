import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateEmployeeAdvanceDto } from './dto/create-employee-advance.dto';
import { UpdateEmployeeAdvanceDto } from './dto/update-employee-advance.dto';
import { EmployeeAdvancesService } from './employee-advances.service';

@Controller('employee-advances')
export class EmployeeAdvancesController {
  constructor(private readonly employeeAdvancesService: EmployeeAdvancesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('employee_id') employeeId?: string,
    @Query('payroll_month') payrollMonth?: string,
    @Query('payroll_year') payrollYear?: string,
  ) {
    return this.employeeAdvancesService.findAll({
      search,
      employeeId,
      payrollMonth,
      payrollYear,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeAdvancesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDto: CreateEmployeeAdvanceDto) {
    return this.employeeAdvancesService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEmployeeAdvanceDto) {
    return this.employeeAdvancesService.update(id, updateDto);
  }
}
