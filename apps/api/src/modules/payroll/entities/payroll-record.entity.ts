import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EmployeeEntity } from '../../employees/entities/employee.entity';

const numericTransformer = {
  to: (value?: number | null) => value ?? 0,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity('payrolls')
@Unique('UQ_payroll_employee_month_year', ['employeeId', 'payrollMonth', 'payrollYear'])
export class PayrollRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => EmployeeEntity, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'payroll_month', type: 'int' })
  payrollMonth!: number;

  @Column({ name: 'payroll_year', type: 'int' })
  payrollYear!: number;

  @Column({ name: 'base_salary', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  baseSalary!: number;

  @Column({ name: 'allowances_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  allowancesAmount!: number;

  @Column({ name: 'advances_deduction_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  advancesDeductionAmount!: number;

  @Column({ name: 'penalties_deduction_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  penaltiesDeductionAmount!: number;

  @Column({ name: 'other_deduction_amount', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  otherDeductionAmount!: number;

  @Column({ name: 'net_salary', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  netSalary!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
