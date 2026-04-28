import { MigrationInterface, QueryRunner } from 'typeorm';

export class DailySalesFinancialLinks1730000012000 implements MigrationInterface {
  name = 'DailySalesFinancialLinks1730000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS drawer_id uuid');
    await queryRunner.query('ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS bank_account_id uuid');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_daily_sales_drawer_id'
        ) THEN
          ALTER TABLE daily_sales
          ADD CONSTRAINT fk_daily_sales_drawer_id
          FOREIGN KEY (drawer_id) REFERENCES drawers(id);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_daily_sales_bank_account_id'
        ) THEN
          ALTER TABLE daily_sales
          ADD CONSTRAINT fk_daily_sales_bank_account_id
          FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE daily_sales DROP CONSTRAINT IF EXISTS fk_daily_sales_bank_account_id');
    await queryRunner.query('ALTER TABLE daily_sales DROP CONSTRAINT IF EXISTS fk_daily_sales_drawer_id');
    await queryRunner.query('ALTER TABLE daily_sales DROP COLUMN IF EXISTS bank_account_id');
    await queryRunner.query('ALTER TABLE daily_sales DROP COLUMN IF EXISTS drawer_id');
  }
}
