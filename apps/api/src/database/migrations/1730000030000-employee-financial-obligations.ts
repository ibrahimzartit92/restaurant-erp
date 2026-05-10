import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeFinancialObligations1730000030000 implements MigrationInterface {
  name = 'EmployeeFinancialObligations1730000030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'employee_debt_cash'`);
    await queryRunner.query(`ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'employee_obligation_repayment_cash'`);
    await queryRunner.query(`ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'employee_obligation_reversal_cash'`);
    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'employee_debt_bank'`);
    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'employee_obligation_repayment_bank'`);
    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'employee_obligation_reversal_bank'`);
    await queryRunner.query(`ALTER TYPE vault_transaction_type ADD VALUE IF NOT EXISTS 'employee_debt'`);
    await queryRunner.query(`ALTER TYPE vault_transaction_type ADD VALUE IF NOT EXISTS 'employee_obligation_repayment'`);
    await queryRunner.query(`ALTER TYPE vault_transaction_type ADD VALUE IF NOT EXISTS 'employee_obligation_reversal'`);

    await queryRunner.query(`ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS recovered_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS remaining_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS status varchar(40) NOT NULL DEFAULT 'active'`);
    await queryRunner.query(`
      UPDATE employee_advances
      SET
        recovered_amount = CASE WHEN payroll_record_id IS NOT NULL THEN amount ELSE COALESCE(recovered_amount, 0) END,
        remaining_amount = CASE WHEN payroll_record_id IS NOT NULL THEN 0 ELSE amount - COALESCE(recovered_amount, 0) END,
        status = CASE WHEN payroll_record_id IS NOT NULL THEN 'settled' ELSE COALESCE(NULLIF(status, ''), 'active') END
      WHERE remaining_amount = 0 OR remaining_amount IS NULL
    `);

    await queryRunner.query(`ALTER TABLE employee_penalties ADD COLUMN IF NOT EXISTS penalty_type varchar(40) NOT NULL DEFAULT 'financial'`);
    await queryRunner.query(`ALTER TABLE employee_penalties ADD COLUMN IF NOT EXISTS recovered_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE employee_penalties ADD COLUMN IF NOT EXISTS remaining_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE employee_penalties ADD COLUMN IF NOT EXISTS status varchar(40) NOT NULL DEFAULT 'active'`);
    await queryRunner.query(`
      UPDATE employee_penalties
      SET
        recovered_amount = CASE WHEN payroll_record_id IS NOT NULL THEN amount ELSE COALESCE(recovered_amount, 0) END,
        remaining_amount = CASE WHEN payroll_record_id IS NOT NULL THEN 0 ELSE amount - COALESCE(recovered_amount, 0) END,
        status = CASE WHEN payroll_record_id IS NOT NULL THEN 'settled' ELSE COALESCE(NULLIF(status, ''), 'active') END
      WHERE remaining_amount = 0 OR remaining_amount IS NULL
    `);

    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS debt_deduction_amount numeric(12,2) NOT NULL DEFAULT 0`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_debts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid NOT NULL,
        debt_date date NOT NULL,
        amount numeric(12,2) NOT NULL DEFAULT 0,
        recovered_amount numeric(12,2) NOT NULL DEFAULT 0,
        remaining_amount numeric(12,2) NOT NULL DEFAULT 0,
        repayment_mode varchar(40) NOT NULL DEFAULT 'manual',
        installment_amount numeric(12,2) NOT NULL DEFAULT 0,
        installment_start_month int,
        installment_start_year int,
        status varchar(40) NOT NULL DEFAULT 'active',
        drawer_id uuid,
        bank_account_id uuid,
        vault_id uuid,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_debts_employee_id ON employee_debts (employee_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_debts_status ON employee_debts (status)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_debts_employee_id') THEN
          ALTER TABLE employee_debts ADD CONSTRAINT FK_employee_debts_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_debts_drawer_id') THEN
          ALTER TABLE employee_debts ADD CONSTRAINT FK_employee_debts_drawer_id FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_debts_bank_account_id') THEN
          ALTER TABLE employee_debts ADD CONSTRAINT FK_employee_debts_bank_account_id FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_debts_vault_id') THEN
          ALTER TABLE employee_debts ADD CONSTRAINT FK_employee_debts_vault_id FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_obligation_repayments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid NOT NULL,
        obligation_kind varchar(40) NOT NULL,
        obligation_id uuid NOT NULL,
        repayment_date date NOT NULL,
        amount numeric(12,2) NOT NULL DEFAULT 0,
        source varchar(40) NOT NULL DEFAULT 'manual',
        payroll_record_id uuid,
        drawer_id uuid,
        bank_account_id uuid,
        vault_id uuid,
        reference_number varchar(120),
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_obligation_repayments_employee_id ON employee_obligation_repayments (employee_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_obligation_repayments_obligation ON employee_obligation_repayments (obligation_kind, obligation_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_obligation_repayments_payroll ON employee_obligation_repayments (payroll_record_id)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_obligation_repayments_employee_id') THEN
          ALTER TABLE employee_obligation_repayments ADD CONSTRAINT FK_employee_obligation_repayments_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_obligation_repayments_payroll_id') THEN
          ALTER TABLE employee_obligation_repayments ADD CONSTRAINT FK_employee_obligation_repayments_payroll_id FOREIGN KEY (payroll_record_id) REFERENCES payrolls(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS employee_obligation_repayments`);
    await queryRunner.query(`DROP TABLE IF EXISTS employee_debts`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS debt_deduction_amount`);
    await queryRunner.query(`ALTER TABLE employee_penalties DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE employee_penalties DROP COLUMN IF EXISTS remaining_amount`);
    await queryRunner.query(`ALTER TABLE employee_penalties DROP COLUMN IF EXISTS recovered_amount`);
    await queryRunner.query(`ALTER TABLE employee_penalties DROP COLUMN IF EXISTS penalty_type`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP COLUMN IF EXISTS remaining_amount`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP COLUMN IF EXISTS recovered_amount`);
  }
}
