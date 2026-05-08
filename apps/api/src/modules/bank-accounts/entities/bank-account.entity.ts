import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BankAccountTransactionEntity } from '../../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../../branches/entities/branch.entity';
import { numericTransformer } from '../../expenses/expense-shared';

@Entity('bank_accounts')
export class BankAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Index()
  @Column({ name: 'account_name', type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 160 })
  bankName!: string;

  @Column({ type: 'varchar', length: 34, nullable: true })
  iban!: string | null;

  @Column({ name: 'account_number', type: 'varchar', length: 60, nullable: true })
  accountNumber!: string | null;

  @Column({ type: 'varchar', length: 10, default: 'SAR' })
  currency!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => BranchEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity | null;

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

  @OneToMany(() => BankAccountTransactionEntity, (transaction) => transaction.bankAccount)
  transactions!: BankAccountTransactionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
