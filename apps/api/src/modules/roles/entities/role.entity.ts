import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinTable,
  UpdateDateColumn,
} from 'typeorm';
import { PermissionEntity } from '../../permissions/entities/permission.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => UserEntity, (user) => user.role)
  users!: UserEntity[];

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: PermissionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
