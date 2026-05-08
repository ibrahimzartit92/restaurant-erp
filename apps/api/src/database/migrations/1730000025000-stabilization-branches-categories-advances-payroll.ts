import { MigrationInterface, QueryRunner } from 'typeorm';

export class StabilizationBranchesCategoriesAdvancesPayroll1730000025000 implements MigrationInterface {
  name = 'StabilizationBranchesCategoriesAdvancesPayroll1730000025000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE item_categories ADD COLUMN IF NOT EXISTS color varchar(20) NOT NULL DEFAULT '#14746f'`);

    await queryRunner.query(`ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'employee_advance_bank'`);
    await queryRunner.query(`ALTER TYPE vault_transaction_type ADD VALUE IF NOT EXISTS 'employee_advance'`);

    await queryRunner.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS branch_id uuid`);
    await queryRunner.query(`ALTER TABLE vaults ADD COLUMN IF NOT EXISTS branch_id uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_bank_accounts_branch_id ON bank_accounts (branch_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_vaults_branch_id ON vaults (branch_id)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bank_accounts_branch_id') THEN
          ALTER TABLE bank_accounts
          ADD CONSTRAINT FK_bank_accounts_branch_id
          FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_vaults_branch_id') THEN
          ALTER TABLE vaults
          ADD CONSTRAINT FK_vaults_branch_id
          FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS bank_account_id uuid`);
    await queryRunner.query(`ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS vault_id uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_advances_bank_account_id ON employee_advances (bank_account_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_advances_vault_id ON employee_advances (vault_id)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_advances_bank_account_id') THEN
          ALTER TABLE employee_advances
          ADD CONSTRAINT FK_employee_advances_bank_account_id
          FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_advances_vault_id') THEN
          ALTER TABLE employee_advances
          ADD CONSTRAINT FK_employee_advances_vault_id
          FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS payroll_mode varchar(30) NOT NULL DEFAULT 'fixed_monthly'`);
    await queryRunner.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_monthly_salary numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate numeric(12,2) NOT NULL DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payroll_mode varchar(30) NOT NULL DEFAULT 'fixed_monthly'`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS work_hours numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS hourly_rate numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS extra_hours numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS extra_hour_rate numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS extra_hours_amount numeric(12,2) NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS extra_hours_amount`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS extra_hour_rate`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS extra_hours`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS hourly_rate`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS work_hours`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS payroll_mode`);
    await queryRunner.query(`ALTER TABLE employees DROP COLUMN IF EXISTS hourly_rate`);
    await queryRunner.query(`ALTER TABLE employees DROP COLUMN IF EXISTS base_monthly_salary`);
    await queryRunner.query(`ALTER TABLE employees DROP COLUMN IF EXISTS payroll_mode`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP CONSTRAINT IF EXISTS FK_employee_advances_vault_id`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP CONSTRAINT IF EXISTS FK_employee_advances_bank_account_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_employee_advances_vault_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_employee_advances_bank_account_id`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP COLUMN IF EXISTS vault_id`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP COLUMN IF EXISTS bank_account_id`);
    await queryRunner.query(`ALTER TABLE vaults DROP CONSTRAINT IF EXISTS FK_vaults_branch_id`);
    await queryRunner.query(`ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS FK_bank_accounts_branch_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_vaults_branch_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_bank_accounts_branch_id`);
    await queryRunner.query(`ALTER TABLE vaults DROP COLUMN IF EXISTS branch_id`);
    await queryRunner.query(`ALTER TABLE bank_accounts DROP COLUMN IF EXISTS branch_id`);
    await queryRunner.query(`ALTER TABLE item_categories DROP COLUMN IF EXISTS color`);
  }
}
