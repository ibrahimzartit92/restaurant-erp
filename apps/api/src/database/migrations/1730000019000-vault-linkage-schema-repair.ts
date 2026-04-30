import { MigrationInterface, QueryRunner } from 'typeorm';

export class VaultLinkageSchemaRepair1730000019000 implements MigrationInterface {
  name = 'VaultLinkageSchemaRepair1730000019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE supplier_payment_method ADD VALUE IF NOT EXISTS 'vault'`);
    await queryRunner.query(`ALTER TYPE expense_payment_method ADD VALUE IF NOT EXISTS 'vault'`);
    await queryRunner.query(`ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'transfer_to_vault'`);
    await queryRunner.query(`ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'payroll_payment_cash'`);
    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'deposit_from_vault'`);
    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'withdrawal_to_vault'`);
    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'payroll_payment_bank'`);

    await queryRunner.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vault_id uuid`);
    await queryRunner.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_allocations jsonb`);
    await queryRunner.query(`ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS vault_id uuid`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS remaining_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_allocations jsonb`);
    await queryRunner.query(`UPDATE payrolls SET remaining_amount = GREATEST(net_salary - paid_amount, 0)`);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE expenses
        ADD CONSTRAINT fk_expenses_vault_id
        FOREIGN KEY (vault_id) REFERENCES vaults(id);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_table THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE supplier_payments
        ADD CONSTRAINT fk_supplier_payments_vault_id
        FOREIGN KEY (vault_id) REFERENCES vaults(id);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_table THEN NULL;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_vault_id ON expenses(vault_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supplier_payments_vault_id ON supplier_payments(vault_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_supplier_payments_vault_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_expenses_vault_id`);
    await queryRunner.query(`ALTER TABLE supplier_payments DROP CONSTRAINT IF EXISTS fk_supplier_payments_vault_id`);
    await queryRunner.query(`ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_vault_id`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS payment_allocations`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS remaining_amount`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS paid_amount`);
    await queryRunner.query(`ALTER TABLE supplier_payments DROP COLUMN IF EXISTS vault_id`);
    await queryRunner.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS payment_allocations`);
    await queryRunner.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS vault_id`);
  }
}
