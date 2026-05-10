import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { EmployeeEntity } from '../employees/entities/employee.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { ReportsModule } from '../reports/reports.module';
import { SettingsModule } from '../settings/settings.module';
import { VaultsModule } from '../vaults/vaults.module';
import { EmployeeDebtEntity } from './entities/employee-debt.entity';
import { EmployeeObligationRepaymentEntity } from './entities/employee-obligation-repayment.entity';
import { EmployeeFinancialObligationsController } from './employee-financial-obligations.controller';
import { EmployeeFinancialObligationsService } from './employee-financial-obligations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      DrawerEntity,
      DrawerTransactionEntity,
      EmployeeAdvanceEntity,
      EmployeeDebtEntity,
      EmployeeEntity,
      EmployeeObligationRepaymentEntity,
      EmployeePenaltyEntity,
      PayrollRecordEntity,
    ]),
    ReportsModule,
    SettingsModule,
    VaultsModule,
  ],
  controllers: [EmployeeFinancialObligationsController],
  providers: [EmployeeFinancialObligationsService],
  exports: [EmployeeFinancialObligationsService],
})
export class EmployeeFinancialObligationsModule {}
