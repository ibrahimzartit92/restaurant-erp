import { MigrationInterface, QueryRunner } from 'typeorm';

export class DrawerDefaultFloat1730000014000 implements MigrationInterface {
  name = 'DrawerDefaultFloat1730000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE drawers ADD COLUMN IF NOT EXISTS default_opening_balance numeric(12, 2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE drawers ADD COLUMN IF NOT EXISTS default_cash_float numeric(12, 2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'UPDATE drawers SET default_cash_float = default_opening_balance WHERE default_cash_float = 0',
    );
    await queryRunner.query(
      'ALTER TABLE drawer_daily_sessions ADD COLUMN IF NOT EXISTS required_closing_float numeric(12, 2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'UPDATE drawer_daily_sessions SET required_closing_float = opening_balance WHERE required_closing_float = 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE drawer_daily_sessions DROP COLUMN IF EXISTS required_closing_float');
    await queryRunner.query('ALTER TABLE drawers DROP COLUMN IF EXISTS default_cash_float');
    await queryRunner.query('ALTER TABLE drawers DROP COLUMN IF EXISTS default_opening_balance');
  }
}
