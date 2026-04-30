import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifiedPayrollPayments1730000018000 implements MigrationInterface {
  name = 'UnifiedPayrollPayments1730000018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS remaining_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_allocations jsonb`);
    await queryRunner.query(`UPDATE payrolls SET remaining_amount = GREATEST(net_salary - paid_amount, 0)`);
    await queryRunner.query(`ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'payroll_payment_cash'`);
    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'payroll_payment_bank'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS payment_allocations`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS remaining_amount`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS paid_amount`);
  }
}
