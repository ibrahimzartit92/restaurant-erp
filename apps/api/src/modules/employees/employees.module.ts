import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { AttendanceFileEntity } from '../attendance-files/entities/attendance-file.entity';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeEntity } from './entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceFileEntity,
      EmployeeAdvanceEntity,
      EmployeeEntity,
      EmployeePenaltyEntity,
      PayrollRecordEntity,
    ]),
    BranchesModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
