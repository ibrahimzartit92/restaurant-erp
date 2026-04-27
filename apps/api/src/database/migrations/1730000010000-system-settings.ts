import { MigrationInterface, QueryRunner } from 'typeorm';

export class SystemSettings1730000010000 implements MigrationInterface {
  name = 'SystemSettings1730000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "group" varchar(80) NOT NULL,
        key varchar(120) NOT NULL,
        value jsonb,
        label varchar(180) NOT NULL,
        type varchar(30) NOT NULL,
        note text,
        options jsonb,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_settings_group_key UNIQUE ("group", key)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE settings`);
  }
}
