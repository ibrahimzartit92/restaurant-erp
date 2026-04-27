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
import { EmployeeEntity } from '../../employees/entities/employee.entity';

@Entity('attendance_files')
export class AttendanceFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId!: string | null;

  @ManyToOne(() => EmployeeEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity | null;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => BranchEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity | null;

  @Column({ type: 'int' })
  month!: number;

  @Column({ type: 'int' })
  year!: number;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 50 })
  fileType!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
