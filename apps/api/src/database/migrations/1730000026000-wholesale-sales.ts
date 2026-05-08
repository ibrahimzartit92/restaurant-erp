import { MigrationInterface, QueryRunner } from 'typeorm';

export class WholesaleSales1730000026000 implements MigrationInterface {
  name = 'WholesaleSales1730000026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "stock_movements_movement_type_enum" ADD VALUE IF NOT EXISTS 'wholesale_sale_out'`);
    await queryRunner.query(`ALTER TYPE "drawer_transactions_transaction_type_enum" ADD VALUE IF NOT EXISTS 'wholesale_sales_cash_collection'`);
    await queryRunner.query(`ALTER TYPE "bank_account_transactions_transaction_type_enum" ADD VALUE IF NOT EXISTS 'wholesale_sales_receipt_bank'`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(180) NOT NULL,
        "phone" varchar(40),
        "address" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_name" ON "customers" ("name")`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "wholesale_sales_invoices_document_status_enum" AS ENUM ('draft', 'approved', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "wholesale_sales_invoices_payment_status_enum" AS ENUM ('unpaid', 'partially_paid', 'paid');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "wholesale_sales_payments_payment_method_enum" AS ENUM ('cash', 'bank');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wholesale_sales_invoices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "invoice_number" varchar(50) NOT NULL UNIQUE,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
        "branch_id" uuid NOT NULL REFERENCES "branches"("id"),
        "warehouse_id" uuid NOT NULL REFERENCES "warehouses"("id"),
        "invoice_date" date NOT NULL,
        "due_date" date,
        "document_status" "wholesale_sales_invoices_document_status_enum" NOT NULL DEFAULT 'draft',
        "payment_status" "wholesale_sales_invoices_payment_status_enum" NOT NULL DEFAULT 'unpaid',
        "subtotal_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "paid_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "remaining_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "cash_transferred_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_invoice_customer" ON "wholesale_sales_invoices" ("customer_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_invoice_branch" ON "wholesale_sales_invoices" ("branch_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_invoice_warehouse" ON "wholesale_sales_invoices" ("warehouse_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_invoice_date" ON "wholesale_sales_invoices" ("invoice_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_invoice_document_status" ON "wholesale_sales_invoices" ("document_status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_invoice_payment_status" ON "wholesale_sales_invoices" ("payment_status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wholesale_sales_invoice_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "invoice_id" uuid NOT NULL REFERENCES "wholesale_sales_invoices"("id") ON DELETE CASCADE,
        "item_id" uuid NOT NULL REFERENCES "items"("id"),
        "unit_id" uuid REFERENCES "units"("id"),
        "quantity" numeric(12,3) NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "line_total" numeric(12,2) NOT NULL,
        "notes" text
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_item_invoice" ON "wholesale_sales_invoice_items" ("invoice_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_item_item" ON "wholesale_sales_invoice_items" ("item_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wholesale_sales_payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "payment_number" varchar(50) NOT NULL UNIQUE,
        "invoice_id" uuid NOT NULL REFERENCES "wholesale_sales_invoices"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id"),
        "payment_date" date NOT NULL,
        "payment_method" "wholesale_sales_payments_payment_method_enum" NOT NULL,
        "drawer_id" uuid REFERENCES "drawers"("id"),
        "bank_account_id" uuid REFERENCES "bank_accounts"("id"),
        "amount" numeric(12,2) NOT NULL,
        "reference_number" varchar(120),
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_payment_invoice" ON "wholesale_sales_payments" ("invoice_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_payment_branch" ON "wholesale_sales_payments" ("branch_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wholesale_sales_payment_date" ON "wholesale_sales_payments" ("payment_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wholesale_sales_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wholesale_sales_invoice_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wholesale_sales_invoices"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "wholesale_sales_payments_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "wholesale_sales_invoices_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "wholesale_sales_invoices_document_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
  }
}
