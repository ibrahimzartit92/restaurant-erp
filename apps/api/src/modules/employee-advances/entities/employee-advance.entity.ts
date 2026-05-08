import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmployeeEntity } from '../../employees/entities/employee.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { BankAccountEntity } from '../../bank-accounts/entities/bank-account.entity';
import { PayrollRecordEntity } from '../../payroll/entities/payroll-record.entity';
import { VaultEntity } from '../../vaults/entities/vault.entity';

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('employee_advances')
export class EmployeeAdvanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => EmployeeEntity, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'advance_date', type: 'date' })
  advanceDate!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount!: number;

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

  @Column({ name: 'payroll_month', type: 'int', nullable: true })
  payrollMonth!: number | null;

  @Column({ name: 'payroll_year', type: 'int', nullable: true })
  payrollYear!: number | null;

  @Column({ name: 'payroll_record_id', type: 'uuid', nullable: true })
  payrollRecordId!: string | null;

  @ManyToOne(() => PayrollRecordEntity, { nullable: true })
  @JoinColumn({ name: 'payroll_record_id' })
  payrollRecord!: PayrollRecordEntity | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
