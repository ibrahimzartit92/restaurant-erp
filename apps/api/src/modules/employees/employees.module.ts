import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeEntity } from './entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeEntity]), BranchesModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
