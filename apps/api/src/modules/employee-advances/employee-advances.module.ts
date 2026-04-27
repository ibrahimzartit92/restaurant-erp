import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeAdvancesController } from './employee-advances.controller';
import { EmployeeAdvancesService } from './employee-advances.service';
import { EmployeeAdvanceEntity } from './entities/employee-advance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeAdvanceEntity]), EmployeesModule],
  controllers: [EmployeeAdvancesController],
  providers: [EmployeeAdvancesService],
  exports: [EmployeeAdvancesService],
})
export class EmployeeAdvancesModule {}
