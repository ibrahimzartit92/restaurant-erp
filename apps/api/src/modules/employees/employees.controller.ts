import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('branch_id') branchId?: string,
    @Query('is_active') isActive?: string,
  ) {
    return this.employeesService.findAll({
      search,
      branchId,
      isActive,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDto: CreateEmployeeDto) {
    return this.employeesService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateDto);
  }
}
