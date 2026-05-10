import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BankAccountEntity } from '../../bank-accounts/entities/bank-account.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { EmployeeEntity } from '../../employees/entities/employee.entity';
import { numericTransformer } from '../../expenses/expense-shared';
import { VaultEntity } from '../../vaults/entities/vault.entity';

export enum EmployeeDebtRepaymentMode {
  Installment = 'installment',
  Manual = 'manual',
}

export enum EmployeeDebtStatus {
  Active = 'active',
  PartiallyRecovered = 'partially_recovered',
  Settled = 'settled',
  Cancelled = 'cancelled',
}

@Entity('employee_debts')
export class EmployeeDebtEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => EmployeeEntity, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'debt_date', type: 'date' })
  debtDate!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'recovered_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  recoveredAmount!: number;

  @Column({ name: 'remaining_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  remainingAmount!: number;

  @Column({ name: 'repayment_mode', type: 'varchar', length: 40, default: EmployeeDebtRepaymentMode.Manual })
  repaymentMode!: EmployeeDebtRepaymentMode;

  @Column({ name: 'installment_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  installmentAmount!: number;

  @Column({ name: 'installment_start_month', type: 'int', nullable: true })
  installmentStartMonth!: number | null;

  @Column({ name: 'installment_start_year', type: 'int', nullable: true })
  installmentStartYear!: number | null;

  @Column({ type: 'varchar', length: 40, default: EmployeeDebtStatus.Active })
  status!: EmployeeDebtStatus;

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

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
