import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { DrawerEntity } from '../../drawers/entities/drawer.entity';
import { numericTransformer } from '../../expenses/expense-shared';

export enum DrawerDailySessionStatus {
  Open = 'open',
  Closed = 'closed',
}

@Entity('drawer_daily_sessions')
@Unique('uq_drawer_daily_sessions_drawer_date', ['drawerId', 'sessionDate'])
export class DrawerDailySessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'drawer_id', type: 'uuid' })
  drawerId!: string;

  @ManyToOne(() => DrawerEntity, { eager: true })
  @JoinColumn({ name: 'drawer_id' })
  drawer!: DrawerEntity;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity;

  @Index()
  @Column({ name: 'session_date', type: 'date' })
  sessionDate!: string;

  @Column({
    name: 'opening_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  openingBalance!: number;

  @Column({
    name: 'closing_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  closingBalance!: number | null;

  @Column({
    name: 'calculated_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  calculatedBalance!: number;

  @Column({
    name: 'difference_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  differenceAmount!: number;

  @Column({ type: 'enum', enum: DrawerDailySessionStatus, default: DrawerDailySessionStatus.Open })
  status!: DrawerDailySessionStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
