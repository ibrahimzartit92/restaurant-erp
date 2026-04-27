import { MigrationInterface, QueryRunner } from 'typeorm';

export class BankAccountTransactions1730000006000 implements MigrationInterface {
  name = 'BankAccountTransactions1730000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE bank_accounts ADD COLUMN iban varchar(34)`);
    await queryRunner.query(`ALTER TABLE bank_accounts ADD COLUMN account_number varchar(60)`);
    await queryRunner.query(`ALTER TABLE bank_accounts ADD COLUMN currency varchar(10) NOT NULL DEFAULT 'SAR'`);
    await queryRunner.query(`ALTER TABLE bank_accounts ADD COLUMN notes text`);
    await queryRunner.query(`ALTER TABLE bank_accounts ALTER COLUMN bank_name SET NOT NULL`);

    await queryRunner.query(`
      CREATE TYPE bank_account_transaction_type AS ENUM (
        'deposit',
        'withdrawal',
        'transfer',
        'settlement',
        'supplier_payment_bank',
        'expense_bank',
        'sales_receipt_bank',
        'refund_bank'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE bank_account_transaction_direction AS ENUM (
        'incoming',
        'outgoing'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bank_account_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
        transaction_date date NOT NULL,
        transaction_type bank_account_transaction_type NOT NULL,
        direction bank_account_transaction_direction NOT NULL,
        amount numeric(12, 2) NOT NULL,
        branch_id uuid REFERENCES branches(id),
        source_type varchar(80),
        source_id uuid,
        reference_number varchar(120),
        description varchar(255) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      'CREATE INDEX idx_bank_account_transactions_account_id ON bank_account_transactions(bank_account_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_bank_account_transactions_transaction_date ON bank_account_transactions(transaction_date)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_bank_account_transactions_transaction_type ON bank_account_transactions(transaction_type)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_bank_account_transactions_branch_id ON bank_account_transactions(branch_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_bank_account_transactions_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_bank_account_transactions_transaction_type');
    await queryRunner.query('DROP INDEX IF EXISTS idx_bank_account_transactions_transaction_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_bank_account_transactions_account_id');
    await queryRunner.query('DROP TABLE bank_account_transactions');
    await queryRunner.query('DROP TYPE bank_account_transaction_direction');
    await queryRunner.query('DROP TYPE bank_account_transaction_type');
    await queryRunner.query(`ALTER TABLE bank_accounts ALTER COLUMN bank_name DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE bank_accounts DROP COLUMN notes`);
    await queryRunner.query(`ALTER TABLE bank_accounts DROP COLUMN currency`);
    await queryRunner.query(`ALTER TABLE bank_accounts DROP COLUMN account_number`);
    await queryRunner.query(`ALTER TABLE bank_accounts DROP COLUMN iban`);
  }
}
