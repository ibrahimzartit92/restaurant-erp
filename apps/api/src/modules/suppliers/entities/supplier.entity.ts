import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierRepresentativeEntity } from '../../supplier-representatives/entities/supplier-representative.entity';

@Entity('suppliers')
export class SupplierEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Index()
  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'default_due_days', type: 'integer', default: 0 })
  defaultDueDays!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => SupplierRepresentativeEntity, (representative) => representative.supplier)
  representatives!: SupplierRepresentativeEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
