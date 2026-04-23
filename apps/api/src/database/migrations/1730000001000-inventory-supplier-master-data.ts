import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventorySupplierMasterData1730000001000 implements MigrationInterface {
  name = 'InventorySupplierMasterData1730000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE item_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(160) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE units (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(120) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(180) NOT NULL,
        category_id uuid NOT NULL REFERENCES item_categories(id),
        unit_id uuid NOT NULL REFERENCES units(id),
        initial_price numeric(12, 2) NOT NULL DEFAULT 0,
        cost_price numeric(12, 2) NOT NULL DEFAULT 0,
        sale_price numeric(12, 2) NOT NULL DEFAULT 0,
        search_keywords varchar(500) NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE suppliers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(50) NOT NULL UNIQUE,
        name varchar(180) NOT NULL,
        phone varchar(40),
        address text,
        default_due_days integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE supplier_representatives (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        name varchar(160) NOT NULL,
        phone varchar(40),
        is_primary boolean NOT NULL DEFAULT false,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX idx_item_categories_name ON item_categories(name)');
    await queryRunner.query('CREATE INDEX idx_units_name ON units(name)');
    await queryRunner.query('CREATE INDEX idx_items_name ON items(name)');
    await queryRunner.query('CREATE INDEX idx_items_category_id ON items(category_id)');
    await queryRunner.query('CREATE INDEX idx_items_unit_id ON items(unit_id)');
    await queryRunner.query('CREATE INDEX idx_items_search_keywords ON items(search_keywords)');
    await queryRunner.query('CREATE INDEX idx_suppliers_name ON suppliers(name)');
    await queryRunner.query(
      'CREATE INDEX idx_supplier_representatives_supplier_id ON supplier_representatives(supplier_id)',
    );
    await queryRunner.query('CREATE INDEX idx_supplier_representatives_name ON supplier_representatives(name)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_supplier_representatives_name');
    await queryRunner.query('DROP INDEX IF EXISTS idx_supplier_representatives_supplier_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_suppliers_name');
    await queryRunner.query('DROP INDEX IF EXISTS idx_items_search_keywords');
    await queryRunner.query('DROP INDEX IF EXISTS idx_items_unit_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_items_category_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_items_name');
    await queryRunner.query('DROP INDEX IF EXISTS idx_units_name');
    await queryRunner.query('DROP INDEX IF EXISTS idx_item_categories_name');
    await queryRunner.query('DROP TABLE supplier_representatives');
    await queryRunner.query('DROP TABLE suppliers');
    await queryRunner.query('DROP TABLE items');
    await queryRunner.query('DROP TABLE units');
    await queryRunner.query('DROP TABLE item_categories');
  }
}
