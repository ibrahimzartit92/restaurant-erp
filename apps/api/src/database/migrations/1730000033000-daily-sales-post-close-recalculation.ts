import { MigrationInterface, QueryRunner } from 'typeorm';

export class DailySalesPostCloseRecalculation1730000033000 implements MigrationInterface {
  name = 'DailySalesPostCloseRecalculation1730000033000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE daily_sales_closings
        ADD COLUMN IF NOT EXISTS original_summary_values jsonb,
        ADD COLUMN IF NOT EXISTS post_close_changes jsonb,
        ADD COLUMN IF NOT EXISTS post_close_updated_at timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE daily_sales_closings
        DROP COLUMN IF EXISTS post_close_updated_at,
        DROP COLUMN IF EXISTS post_close_changes,
        DROP COLUMN IF EXISTS original_summary_values
    `);
  }
}
