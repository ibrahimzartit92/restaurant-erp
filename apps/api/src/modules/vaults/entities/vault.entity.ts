import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../expenses/expense-shared';
import { VaultTransactionEntity } from './vault-transaction.entity';

@Entity('vaults')
export class VaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Index()
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({
    name: 'opening_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  openingBalance!: number;

  @Column({ name: 'opening_balance_date', type: 'date', nullable: true })
  openingBalanceDate!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => VaultTransactionEntity, (transaction) => transaction.vault)
  transactions!: VaultTransactionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
