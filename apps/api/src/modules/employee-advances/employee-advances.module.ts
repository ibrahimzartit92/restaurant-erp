import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeeAdvancesController } from './employee-advances.controller';
import { EmployeeAdvancesService } from './employee-advances.service';
import { EmployeeAdvanceEntity } from './entities/employee-advance.entity';
import { UndoActionsModule } from '../undo-actions/undo-actions.module';
import { VaultsModule } from '../vaults/vaults.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DrawerEntity, DrawerTransactionEntity, EmployeeAdvanceEntity]),
    EmployeesModule,
    UndoActionsModule,
    VaultsModule,
  ],
  controllers: [EmployeeAdvancesController],
  providers: [EmployeeAdvancesService],
  exports: [EmployeeAdvancesService],
})
export class EmployeeAdvancesModule {}
