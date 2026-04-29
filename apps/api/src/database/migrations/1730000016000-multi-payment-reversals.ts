import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiPaymentReversals1730000016000 implements MigrationInterface {
  name = 'MultiPaymentReversals1730000016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'supplier_payment_cash_reversal'");
    await queryRunner.query("ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'expense_cash_reversal'");
    await queryRunner.query(
      "ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'supplier_payment_bank_reversal'",
    );
    await queryRunner.query("ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'expense_bank_reversal'");
    await queryRunner.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_allocations jsonb');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE expenses DROP COLUMN IF EXISTS payment_allocations');
  }
}
