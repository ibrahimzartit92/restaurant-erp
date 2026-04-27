import { MigrationInterface, QueryRunner } from 'typeorm';

export class Attachments1730000011000 implements MigrationInterface {
  name = 'Attachments1730000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type varchar(80) NOT NULL,
        entity_id uuid NOT NULL,
        file_name varchar(255) NOT NULL,
        file_path text NOT NULL,
        file_type varchar(120) NOT NULL,
        file_size integer,
        uploaded_by uuid,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_attachments_entity');
    await queryRunner.query('DROP TABLE attachments');
  }
}
