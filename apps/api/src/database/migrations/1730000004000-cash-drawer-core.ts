import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashDrawerCore1730000004000 implements MigrationInterface {
  name = 'CashDrawerCore1730000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE drawers ADD COLUMN branch_id uuid');
    await queryRunner.query('ALTER TABLE drawers ADD COLUMN notes text');
    await queryRunner.query('ALTER TABLE drawers ADD CONSTRAINT fk_drawers_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_drawers_branch_id ON drawers(branch_id)');

    await queryRunner.query(`
      CREATE TYPE drawer_daily_session_status AS ENUM (
        'open',
        'closed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE drawer_daily_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        drawer_id uuid NOT NULL REFERENCES drawers(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        session_date date NOT NULL,
        opening_balance numeric(12, 2) NOT NULL DEFAULT 0,
        closing_balance numeric(12, 2),
        calculated_balance numeric(12, 2) NOT NULL DEFAULT 0,
        difference_amount numeric(12, 2) NOT NULL DEFAULT 0,
        status drawer_daily_session_status NOT NULL DEFAULT 'open',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_drawer_daily_sessions_drawer_date UNIQUE (drawer_id, session_date)
      )
    `);

    await queryRunner.query(`
      CREATE TYPE drawer_transaction_type AS ENUM (
        'daily_cash_sales',
        'supplier_payment_cash',
        'expense_cash',
        'sales_return_cash',
        'deposit',
        'withdrawal',
        'settlement',
        'transfer'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE drawer_transaction_direction AS ENUM (
        'in',
        'out'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE drawer_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        drawer_id uuid NOT NULL REFERENCES drawers(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        transaction_date date NOT NULL,
        transaction_type drawer_transaction_type NOT NULL,
        direction drawer_transaction_direction NOT NULL,
        amount numeric(12, 2) NOT NULL,
        source_type varchar(80),
        source_id uuid,
        description varchar(240) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX idx_drawer_daily_sessions_drawer_id ON drawer_daily_sessions(drawer_id)');
    await queryRunner.query('CREATE INDEX idx_drawer_daily_sessions_branch_id ON drawer_daily_sessions(branch_id)');
    await queryRunner.query('CREATE INDEX idx_drawer_daily_sessions_session_date ON drawer_daily_sessions(session_date)');
    await queryRunner.query('CREATE INDEX idx_drawer_transactions_drawer_id ON drawer_transactions(drawer_id)');
    await queryRunner.query('CREATE INDEX idx_drawer_transactions_branch_id ON drawer_transactions(branch_id)');
    await queryRunner.query('CREATE INDEX idx_drawer_transactions_transaction_date ON drawer_transactions(transaction_date)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_drawer_transactions_transaction_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_drawer_transactions_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_drawer_transactions_drawer_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_drawer_daily_sessions_session_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_drawer_daily_sessions_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_drawer_daily_sessions_drawer_id');
    await queryRunner.query('DROP TABLE drawer_transactions');
    await queryRunner.query('DROP TYPE drawer_transaction_direction');
    await queryRunner.query('DROP TYPE drawer_transaction_type');
    await queryRunner.query('DROP TABLE drawer_daily_sessions');
    await queryRunner.query('DROP TYPE drawer_daily_session_status');
    await queryRunner.query('DROP INDEX IF EXISTS uq_drawers_branch_id');
    await queryRunner.query('ALTER TABLE drawers DROP CONSTRAINT IF EXISTS fk_drawers_branch_id');
    await queryRunner.query('ALTER TABLE drawers DROP COLUMN notes');
    await queryRunner.query('ALTER TABLE drawers DROP COLUMN branch_id');
  }
}
