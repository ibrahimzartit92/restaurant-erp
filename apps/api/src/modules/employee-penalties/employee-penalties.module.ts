import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeePenaltiesController } from './employee-penalties.controller';
import { EmployeePenaltiesService } from './employee-penalties.service';
import { EmployeePenaltyEntity } from './entities/employee-penalty.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeePenaltyEntity]), EmployeesModule],
  controllers: [EmployeePenaltiesController],
  providers: [EmployeePenaltiesService],
  exports: [EmployeePenaltiesService],
})
export class EmployeePenaltiesModule {}
