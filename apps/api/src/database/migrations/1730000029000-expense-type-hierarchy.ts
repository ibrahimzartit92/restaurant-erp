import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpenseTypeHierarchy1730000029000 implements MigrationInterface {
  name = 'ExpenseTypeHierarchy1730000029000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expense_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id uuid NOT NULL REFERENCES expense_categories(id),
        name varchar(160) NOT NULL,
        code varchar(50) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_expense_types_category_name UNIQUE (category_id, name),
        CONSTRAINT uq_expense_types_category_code UNIQUE (category_id, code)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expense_types_category_id ON expense_types(category_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expense_types_name ON expense_types(name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expense_types_code ON expense_types(code)`);

    await queryRunner.query(`
      INSERT INTO expense_types (category_id, name, code, is_active, notes)
      SELECT category.id, 'عام', 'GENERAL', true, 'نوع افتراضي تم إنشاؤه لترحيل المصاريف القديمة.'
      FROM expense_categories category
      WHERE NOT EXISTS (
        SELECT 1 FROM expense_types expense_type
        WHERE expense_type.category_id = category.id AND expense_type.code = 'GENERAL'
      )
    `);

    await queryRunner.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type_id uuid`);
    await queryRunner.query(`
      UPDATE expenses expense
      SET expense_type_id = expense_type.id
      FROM expense_types expense_type
      WHERE expense.expense_type_id IS NULL
        AND expense_type.category_id = expense.expense_category_id
        AND expense_type.code = 'GENERAL'
    `);
    await queryRunner.query(`ALTER TABLE expenses ALTER COLUMN expense_type_id SET NOT NULL`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_expense_type_id'
        ) THEN
          ALTER TABLE expenses
            ADD CONSTRAINT fk_expenses_expense_type_id
            FOREIGN KEY (expense_type_id) REFERENCES expense_types(id);
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_expense_type_id ON expenses(expense_type_id)`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_payment_status_enum') THEN
          CREATE TYPE expense_payment_status_enum AS ENUM ('unpaid', 'partially_paid', 'paid');
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS remaining_amount numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS payment_status expense_payment_status_enum NOT NULL DEFAULT 'unpaid'
    `);

    await queryRunner.query(`
      UPDATE expenses
      SET paid_amount = COALESCE(
        (
          SELECT SUM(COALESCE((payment ->> 'amount')::numeric, 0))
          FROM jsonb_array_elements(COALESCE(payment_allocations, '[]'::jsonb)) payment
        ),
        CASE WHEN payment_allocations IS NULL AND payment_method IN ('cash', 'bank', 'vault') THEN amount ELSE 0 END
      )
    `);
    await queryRunner.query(`
      UPDATE expenses
      SET remaining_amount = GREATEST(amount - paid_amount, 0),
          payment_status = CASE
            WHEN paid_amount <= 0 THEN 'unpaid'::expense_payment_status_enum
            WHEN GREATEST(amount - paid_amount, 0) <= 0 THEN 'paid'::expense_payment_status_enum
            ELSE 'partially_paid'::expense_payment_status_enum
          END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_expense_type_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_expenses_expense_type_id`);
    await queryRunner.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS expense_type_id`);
    await queryRunner.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS payment_status`);
    await queryRunner.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS remaining_amount`);
    await queryRunner.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS paid_amount`);
    await queryRunner.query(`DROP TABLE IF EXISTS expense_types`);
    await queryRunner.query(`ALTER TABLE expense_categories DROP COLUMN IF EXISTS is_active`);
    await queryRunner.query(`DROP TYPE IF EXISTS expense_payment_status_enum`);
  }
}
