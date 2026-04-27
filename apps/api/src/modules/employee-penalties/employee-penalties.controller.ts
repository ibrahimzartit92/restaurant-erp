import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateEmployeePenaltyDto } from './dto/create-employee-penalty.dto';
import { UpdateEmployeePenaltyDto } from './dto/update-employee-penalty.dto';
import { EmployeePenaltiesService } from './employee-penalties.service';

@Controller('employee-penalties')
export class EmployeePenaltiesController {
  constructor(private readonly employeePenaltiesService: EmployeePenaltiesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('employee_id') employeeId?: string,
    @Query('payroll_month') payrollMonth?: string,
    @Query('payroll_year') payrollYear?: string,
  ) {
    return this.employeePenaltiesService.findAll({
      search,
      employeeId,
      payrollMonth,
      payrollYear,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeePenaltiesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDto: CreateEmployeePenaltyDto) {
    return this.employeePenaltiesService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEmployeePenaltyDto) {
    return this.employeePenaltiesService.update(id, updateDto);
  }
}
