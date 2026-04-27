import { MigrationInterface, QueryRunner } from 'typeorm';

export class PurchasingCore1730000002000 implements MigrationInterface {
  name = 'PurchasingCore1730000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE warehouses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(160) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE drawers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(160) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bank_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        account_name varchar(160) NOT NULL,
        bank_name varchar(160),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TYPE purchase_invoice_status AS ENUM (
        'draft',
        'open',
        'partially_paid',
        'paid',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE purchase_invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number varchar(50) NOT NULL UNIQUE,
        invoice_label varchar(180),
        branch_id uuid NOT NULL REFERENCES branches(id),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        supplier_id uuid REFERENCES suppliers(id),
        supplier_representative_id uuid REFERENCES supplier_representatives(id),
        invoice_date date NOT NULL,
        status purchase_invoice_status NOT NULL DEFAULT 'open',
        subtotal_amount numeric(12, 2) NOT NULL DEFAULT 0,
        discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
        total_amount numeric(12, 2) NOT NULL DEFAULT 0,
        paid_amount numeric(12, 2) NOT NULL DEFAULT 0,
        remaining_amount numeric(12, 2) NOT NULL DEFAULT 0,
        is_miscellaneous boolean NOT NULL DEFAULT false,
        due_date date,
        last_payment_date date,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE purchase_invoice_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_invoice_id uuid NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
        item_id uuid NOT NULL REFERENCES items(id),
        quantity numeric(12, 3) NOT NULL,
        unit_price numeric(12, 2) NOT NULL,
        line_total numeric(12, 2) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TYPE supplier_payment_method AS ENUM (
        'cash',
        'bank',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE supplier_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_number varchar(50) NOT NULL UNIQUE,
        purchase_invoice_id uuid NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
        branch_id uuid NOT NULL REFERENCES branches(id),
        payment_date date NOT NULL,
        payment_method supplier_payment_method NOT NULL,
        drawer_id uuid REFERENCES drawers(id),
        bank_account_id uuid REFERENCES bank_accounts(id),
        amount numeric(12, 2) NOT NULL,
        reference_number varchar(120),
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX idx_warehouses_name ON warehouses(name)');
    await queryRunner.query('CREATE INDEX idx_drawers_name ON drawers(name)');
    await queryRunner.query('CREATE INDEX idx_bank_accounts_account_name ON bank_accounts(account_name)');
    await queryRunner.query('CREATE INDEX idx_purchase_invoices_branch_id ON purchase_invoices(branch_id)');
    await queryRunner.query('CREATE INDEX idx_purchase_invoices_warehouse_id ON purchase_invoices(warehouse_id)');
    await queryRunner.query('CREATE INDEX idx_purchase_invoices_supplier_id ON purchase_invoices(supplier_id)');
    await queryRunner.query('CREATE INDEX idx_purchase_invoices_invoice_date ON purchase_invoices(invoice_date)');
    await queryRunner.query('CREATE INDEX idx_purchase_invoices_status ON purchase_invoices(status)');
    await queryRunner.query('CREATE INDEX idx_purchase_invoices_invoice_label ON purchase_invoices(invoice_label)');
    await queryRunner.query(
      'CREATE INDEX idx_purchase_invoice_items_invoice_id ON purchase_invoice_items(purchase_invoice_id)',
    );
    await queryRunner.query('CREATE INDEX idx_purchase_invoice_items_item_id ON purchase_invoice_items(item_id)');
    await queryRunner.query('CREATE INDEX idx_supplier_payments_invoice_id ON supplier_payments(purchase_invoice_id)');
    await queryRunner.query('CREATE INDEX idx_supplier_payments_branch_id ON supplier_payments(branch_id)');
    await queryRunner.query('CREATE INDEX idx_supplier_payments_payment_date ON supplier_payments(payment_date)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_supplier_payments_payment_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_supplier_payments_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_supplier_payments_invoice_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoice_items_item_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoice_items_invoice_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoices_invoice_label');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoices_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoices_invoice_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoices_supplier_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoices_warehouse_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_purchase_invoices_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_bank_accounts_account_name');
    await queryRunner.query('DROP INDEX IF EXISTS idx_drawers_name');
    await queryRunner.query('DROP INDEX IF EXISTS idx_warehouses_name');
    await queryRunner.query('DROP TABLE supplier_payments');
    await queryRunner.query('DROP TYPE supplier_payment_method');
    await queryRunner.query('DROP TABLE purchase_invoice_items');
    await queryRunner.query('DROP TABLE purchase_invoices');
    await queryRunner.query('DROP TYPE purchase_invoice_status');
    await queryRunner.query('DROP TABLE bank_accounts');
    await queryRunner.query('DROP TABLE drawers');
    await queryRunner.query('DROP TABLE warehouses');
  }
}
