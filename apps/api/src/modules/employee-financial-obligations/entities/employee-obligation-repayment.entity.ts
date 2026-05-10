import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BankAccountEntity } from '../../bank-accounts/entities/bank-account.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { EmployeeEntity } from '../../employees/entities/employee.entity';
import { numericTransformer } from '../../expenses/expense-shared';
import { PayrollRecordEntity } from '../../payroll/entities/payroll-record.entity';
import { VaultEntity } from '../../vaults/entities/vault.entity';

export enum EmployeeObligationKind {
  Advance = 'advance',
  Debt = 'debt',
  FinancialPenalty = 'financial_penalty',
}

export enum EmployeeObligationRepaymentSource {
  Manual = 'manual',
  Payroll = 'payroll',
  Reversal = 'reversal',
}

@Entity('employee_obligation_repayments')
export class EmployeeObligationRepaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => EmployeeEntity, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'obligation_kind', type: 'varchar', length: 40 })
  obligationKind!: EmployeeObligationKind;

  @Column({ name: 'obligation_id', type: 'uuid' })
  obligationId!: string;

  @Column({ name: 'repayment_date', type: 'date' })
  repaymentDate!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'source', type: 'varchar', length: 40, default: EmployeeObligationRepaymentSource.Manual })
  source!: EmployeeObligationRepaymentSource;

  @Column({ name: 'payroll_record_id', type: 'uuid', nullable: true })
  payrollRecordId!: string | null;

  @ManyToOne(() => PayrollRecordEntity, { nullable: true })
  @JoinColumn({ name: 'payroll_record_id' })
  payrollRecord!: PayrollRecordEntity | null;

  @Column({ name: 'drawer_id', type: 'uuid', nullable: true })
  drawerId!: string | null;

  @ManyToOne(() => DrawerEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'drawer_id' })
  drawer!: DrawerEntity | null;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId!: string | null;

  @ManyToOne(() => BankAccountEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: BankAccountEntity | null;

  @Column({ name: 'vault_id', type: 'uuid', nullable: true })
  vaultId!: string | null;

  @ManyToOne(() => VaultEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'vault_id' })
  vault!: VaultEntity | null;

  @Column({ name: 'reference_number', type: 'varchar', length: 120, nullable: true })
  referenceNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
