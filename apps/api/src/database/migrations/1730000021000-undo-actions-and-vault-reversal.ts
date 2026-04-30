import { MigrationInterface, QueryRunner } from 'typeorm';

export class UndoActionsAndVaultReversal1730000021000 implements MigrationInterface {
  name = 'UndoActionsAndVaultReversal1730000021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE vault_transaction_type ADD VALUE IF NOT EXISTS 'financial_reversal'`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS undo_actions (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        action_type character varying(80) NOT NULL,
        entity_type character varying(80) NOT NULL,
        entity_id uuid NOT NULL,
        record_summary character varying(255) NOT NULL,
        snapshot jsonb NOT NULL,
        reverse_to_vault boolean NOT NULL DEFAULT false,
        vault_transaction_source_type character varying(80),
        vault_transaction_source_id uuid,
        status character varying(30) NOT NULL DEFAULT 'pending',
        undone_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT PK_undo_actions_id PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_undo_actions_status_created_at ON undo_actions (status, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_undo_actions_entity ON undo_actions (entity_type, entity_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_undo_actions_entity`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_undo_actions_status_created_at`);
    await queryRunner.query(`DROP TABLE IF EXISTS undo_actions`);
  }
}
