import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinanceCore1730000003000 implements MigrationInterface {
  name = 'FinanceCore1730000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE expense_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(160) NOT NULL UNIQUE,
        is_fixed boolean NOT NULL DEFAULT false,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TYPE expense_payment_method AS ENUM (
        'cash',
        'bank',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE expense_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(180) NOT NULL,
        branch_id uuid REFERENCES branches(id),
        expense_category_id uuid NOT NULL REFERENCES expense_categories(id),
        default_amount numeric(12, 2) NOT NULL DEFAULT 0,
        payment_method expense_payment_method NOT NULL,
        drawer_id uuid REFERENCES drawers(id),
        bank_account_id uuid REFERENCES bank_accounts(id),
        is_active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE expenses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_number varchar(50) NOT NULL UNIQUE,
        expense_date date NOT NULL,
        branch_id uuid NOT NULL REFERENCES branches(id),
        expense_category_id uuid NOT NULL REFERENCES expense_categories(id),
        title varchar(180) NOT NULL,
        amount numeric(12, 2) NOT NULL,
        payment_method expense_payment_method NOT NULL,
        drawer_id uuid REFERENCES drawers(id),
        bank_account_id uuid REFERENCES bank_accounts(id),
        is_fixed boolean NOT NULL DEFAULT false,
        template_id uuid REFERENCES expense_templates(id),
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE daily_sales (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id uuid NOT NULL REFERENCES branches(id),
        sales_date date NOT NULL,
        cash_sales_amount numeric(12, 2) NOT NULL DEFAULT 0,
        bank_sales_amount numeric(12, 2) NOT NULL DEFAULT 0,
        delivery_sales_amount numeric(12, 2) NOT NULL DEFAULT 0,
        website_sales_amount numeric(12, 2) NOT NULL DEFAULT 0,
        tips_amount numeric(12, 2) NOT NULL DEFAULT 0,
        sales_return_amount numeric(12, 2) NOT NULL DEFAULT 0,
        net_sales_amount numeric(12, 2) NOT NULL DEFAULT 0,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_daily_sales_branch_date UNIQUE (branch_id, sales_date)
      )
    `);

    await queryRunner.query('CREATE INDEX idx_expense_categories_name ON expense_categories(name)');
    await queryRunner.query('CREATE INDEX idx_expense_templates_name ON expense_templates(name)');
    await queryRunner.query('CREATE INDEX idx_expense_templates_branch_id ON expense_templates(branch_id)');
    await queryRunner.query(
      'CREATE INDEX idx_expense_templates_category_id ON expense_templates(expense_category_id)',
    );
    await queryRunner.query('CREATE INDEX idx_expenses_expense_date ON expenses(expense_date)');
    await queryRunner.query('CREATE INDEX idx_expenses_branch_id ON expenses(branch_id)');
    await queryRunner.query('CREATE INDEX idx_expenses_category_id ON expenses(expense_category_id)');
    await queryRunner.query('CREATE INDEX idx_expenses_title ON expenses(title)');
    await queryRunner.query('CREATE INDEX idx_daily_sales_branch_id ON daily_sales(branch_id)');
    await queryRunner.query('CREATE INDEX idx_daily_sales_sales_date ON daily_sales(sales_date)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_daily_sales_sales_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_daily_sales_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expenses_title');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expenses_category_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expenses_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expenses_expense_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expense_templates_category_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expense_templates_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expense_templates_name');
    await queryRunner.query('DROP INDEX IF EXISTS idx_expense_categories_name');
    await queryRunner.query('DROP TABLE daily_sales');
    await queryRunner.query('DROP TABLE expenses');
    await queryRunner.query('DROP TABLE expense_templates');
    await queryRunner.query('DROP TYPE expense_payment_method');
    await queryRunner.query('DROP TABLE expense_categories');
  }
}
