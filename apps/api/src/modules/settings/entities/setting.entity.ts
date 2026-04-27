import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SettingValue = string | number | boolean | null;

export type SettingOption = {
  label: string;
  value: string;
};

@Entity('settings')
@Index(['group', 'key'], { unique: true })
export class SettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  group!: string;

  @Column({ type: 'varchar', length: 120 })
  key!: string;

  @Column({ type: 'jsonb', nullable: true })
  value!: SettingValue;

  @Column({ type: 'varchar', length: 180 })
  label!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options!: SettingOption[] | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
