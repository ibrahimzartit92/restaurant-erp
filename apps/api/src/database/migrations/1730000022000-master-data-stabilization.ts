import { MigrationInterface, QueryRunner } from 'typeorm';

export class MasterDataStabilization1730000022000 implements MigrationInterface {
  name = 'MasterDataStabilization1730000022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE items
      ADD COLUMN IF NOT EXISTS purchase_price numeric(12, 2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE items
      SET purchase_price = COALESCE(purchase_price, initial_price, 0)
      WHERE purchase_price = 0 AND COALESCE(initial_price, 0) <> 0
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category_classification_enum') THEN
          CREATE TYPE expense_category_classification_enum AS ENUM ('operating', 'miscellaneous');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE expense_categories
      ADD COLUMN IF NOT EXISTS classification expense_category_classification_enum NOT NULL DEFAULT 'miscellaneous'
    `);

    await queryRunner.query(`
      UPDATE expense_categories
      SET classification = CASE
        WHEN is_fixed THEN 'operating'::expense_category_classification_enum
        ELSE 'miscellaneous'::expense_category_classification_enum
      END
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_backups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name varchar(220) NOT NULL,
        file_path text,
        file_size bigint,
        status varchar(40) NOT NULL DEFAULT 'success',
        backup_type varchar(40) NOT NULL DEFAULT 'manual',
        payload jsonb NOT NULL,
        restored_at timestamptz,
        restore_status varchar(80),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_maintenance_backups_created_at ON maintenance_backups(created_at)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_maintenance_backups_created_at');
    await queryRunner.query('DROP TABLE IF EXISTS maintenance_backups');
    await queryRunner.query('ALTER TABLE expense_categories DROP COLUMN IF EXISTS classification');
    await queryRunner.query('DROP TYPE IF EXISTS expense_category_classification_enum');
    await queryRunner.query('ALTER TABLE items DROP COLUMN IF EXISTS purchase_price');
  }
}
