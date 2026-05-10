import { MigrationInterface, QueryRunner } from 'typeorm';

export class DailySalesClosings1730000031000 implements MigrationInterface {
  name = 'DailySalesClosings1730000031000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_sales_closings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id uuid NOT NULL,
        closing_date date NOT NULL,
        status varchar(30) NOT NULL DEFAULT 'draft',
        drawer_id uuid,
        bank_account_id uuid,
        current_step int NOT NULL DEFAULT 1,
        draft_data jsonb,
        summary_values jsonb,
        handed_cash_amount numeric(12,2) NOT NULL DEFAULT 0,
        expected_cash_amount numeric(12,2) NOT NULL DEFAULT 0,
        cash_difference_amount numeric(12,2) NOT NULL DEFAULT 0,
        generated_daily_sale_id uuid,
        generated_record_links jsonb,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_sales_closings_branch_date ON daily_sales_closings (branch_id, closing_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_daily_sales_closings_branch_id ON daily_sales_closings (branch_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_daily_sales_closings_status ON daily_sales_closings (status)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_daily_sales_closings_branch_id') THEN
          ALTER TABLE daily_sales_closings ADD CONSTRAINT FK_daily_sales_closings_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_daily_sales_closings_drawer_id') THEN
          ALTER TABLE daily_sales_closings ADD CONSTRAINT FK_daily_sales_closings_drawer_id FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_daily_sales_closings_bank_account_id') THEN
          ALTER TABLE daily_sales_closings ADD CONSTRAINT FK_daily_sales_closings_bank_account_id FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS daily_sales_closings`);
  }
}
