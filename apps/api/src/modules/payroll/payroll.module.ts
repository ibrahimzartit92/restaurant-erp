import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { EmployeesModule } from '../employees/employees.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRecordEntity } from './entities/payroll-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeAdvanceEntity, EmployeePenaltyEntity, PayrollRecordEntity]), EmployeesModule],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
