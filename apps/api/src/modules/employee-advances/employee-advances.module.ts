import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeeAdvancesController } from './employee-advances.controller';
import { EmployeeAdvancesService } from './employee-advances.service';
import { EmployeeAdvanceEntity } from './entities/employee-advance.entity';
import { UndoActionsModule } from '../undo-actions/undo-actions.module';
import { VaultsModule } from '../vaults/vaults.module';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      DrawerEntity,
      DrawerTransactionEntity,
      EmployeeAdvanceEntity,
      PayrollRecordEntity,
    ]),
    EmployeesModule,
    UndoActionsModule,
    VaultsModule,
  ],
  controllers: [EmployeeAdvancesController],
  providers: [EmployeeAdvancesService],
  exports: [EmployeeAdvancesService],
})
export class EmployeeAdvancesModule {}
