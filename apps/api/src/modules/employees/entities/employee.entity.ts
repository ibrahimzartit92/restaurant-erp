import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BranchEntity } from '../../branches/entities/branch.entity';

@Entity('employees')
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_number', type: 'varchar', length: 50, unique: true })
  employeeNumber!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 180 })
  fullName!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ name: 'job_title', type: 'varchar', length: 120, nullable: true })
  jobTitle!: string | null;

  @Column({ name: 'default_branch_id', type: 'uuid', nullable: true })
  defaultBranchId!: string | null;

  @ManyToOne(() => BranchEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'default_branch_id' })
  defaultBranch!: BranchEntity | null;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
