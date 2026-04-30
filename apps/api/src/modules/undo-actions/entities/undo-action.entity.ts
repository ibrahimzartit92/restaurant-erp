import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UndoActionStatus {
  Pending = 'pending',
  Undone = 'undone',
}

@Entity('undo_actions')
export class UndoActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'action_type', type: 'varchar', length: 80 })
  actionType!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 80 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ name: 'record_summary', type: 'varchar', length: 255 })
  recordSummary!: string;

  @Column({ type: 'jsonb' })
  snapshot!: Record<string, unknown>;

  @Column({ name: 'reverse_to_vault', type: 'boolean', default: false })
  reverseToVault!: boolean;

  @Column({ name: 'vault_transaction_source_type', type: 'varchar', length: 80, nullable: true })
  vaultTransactionSourceType!: string | null;

  @Column({ name: 'vault_transaction_source_id', type: 'uuid', nullable: true })
  vaultTransactionSourceId!: string | null;

  @Column({ type: 'varchar', length: 30, default: UndoActionStatus.Pending })
  status!: UndoActionStatus;

  @Column({ name: 'undone_at', type: 'timestamptz', nullable: true })
  undoneAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
