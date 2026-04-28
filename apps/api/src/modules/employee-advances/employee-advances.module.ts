import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeeAdvancesController } from './employee-advances.controller';
import { EmployeeAdvancesService } from './employee-advances.service';
import { EmployeeAdvanceEntity } from './entities/employee-advance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DrawerEntity, DrawerTransactionEntity, EmployeeAdvanceEntity]), EmployeesModule],
  controllers: [EmployeeAdvancesController],
  providers: [EmployeeAdvancesService],
  exports: [EmployeeAdvancesService],
})
export class EmployeeAdvancesModule {}
