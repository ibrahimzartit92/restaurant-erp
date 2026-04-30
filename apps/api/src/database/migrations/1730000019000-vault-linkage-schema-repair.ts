import { MigrationInterface, QueryRunner } from 'typeorm';

export class VaultLinkageSchemaRepair1730000019000 implements MigrationInterface {
  name = 'VaultLinkageSchemaRepair1730000019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE vault_transaction_type AS ENUM (
          'deposit_from_drawer',
          'deposit_from_bank',
          'manual_deposit',
          'withdrawal_to_bank',
          'expense_payment',
          'supplier_payment',
          'payroll_payment',
          'admin_withdrawal',
          'manual_withdrawal',
          'settlement'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE vault_transaction_direction AS ENUM ('in', 'out');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vaults (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(160) NOT NULL,
        opening_balance numeric(12,2) NOT NULL DEFAULT 0,
        opening_balance_date date,
        is_active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vaults_code ON vaults(code)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vaults_name ON vaults(name)`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vault_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vault_id uuid NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        transaction_date date NOT NULL,
        transaction_type vault_transaction_type NOT NULL,
        direction vault_transaction_direction NOT NULL,
        amount numeric(12,2) NOT NULL,
        branch_id uuid REFERENCES branches(id),
        drawer_id uuid REFERENCES drawers(id),
        bank_account_id uuid REFERENCES bank_accounts(id),
        source_type varchar(80),
        source_id uuid,
        reference_number varchar(120),
        description varchar(255) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vault_transactions_vault ON vault_transactions(vault_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vault_transactions_date ON vault_transactions(transaction_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vault_transactions_type ON vault_transactions(transaction_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vault_transactions_direction ON vault_transactions(direction)`);
    await queryRunner.query(`
      INSERT INTO vaults (code, name, opening_balance, opening_balance_date, is_active, notes)
      VALUES ('MAIN', 'الخزنة الرئيسية', 0, CURRENT_DATE, true, 'الخزنة الرئيسية الافتراضية')
      ON CONFLICT (code) DO NOTHING
    `);

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
