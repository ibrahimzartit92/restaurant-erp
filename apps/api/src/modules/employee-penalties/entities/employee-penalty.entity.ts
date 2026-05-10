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
import { PayrollRecordEntity } from '../../payroll/entities/payroll-record.entity';

export enum EmployeePenaltyType {
  Financial = 'financial',
  NonFinancial = 'non_financial',
}

export enum EmployeePenaltyStatus {
  Active = 'active',
  PartiallyRecovered = 'partially_recovered',
  Settled = 'settled',
  Cancelled = 'cancelled',
}

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('employee_penalties')
export class EmployeePenaltyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => EmployeeEntity, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'penalty_date', type: 'date' })
  penaltyDate!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount!: number;

  @Column({ name: 'penalty_type', type: 'varchar', length: 40, default: EmployeePenaltyType.Financial })
  penaltyType!: EmployeePenaltyType;

  @Column({
    name: 'recovered_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  recoveredAmount!: number;

  @Column({
    name: 'remaining_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  remainingAmount!: number;

  @Column({ type: 'varchar', length: 40, default: EmployeePenaltyStatus.Active })
  status!: EmployeePenaltyStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason!: string | null;

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
