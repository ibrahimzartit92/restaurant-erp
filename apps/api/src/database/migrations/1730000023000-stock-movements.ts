import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockMovements1730000023000 implements MigrationInterface {
  name = 'StockMovements1730000023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE stock_movement_type_enum AS ENUM (
          'purchase_in',
          'transfer_in',
          'transfer_out',
          'manual_in',
          'manual_out',
          'stock_count_adjustment'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        movement_date date NOT NULL,
        warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        item_id uuid NOT NULL REFERENCES items(id),
        unit_id uuid REFERENCES units(id),
        movement_type stock_movement_type_enum NOT NULL,
        quantity_in numeric(12,3) NOT NULL DEFAULT 0,
        quantity_out numeric(12,3) NOT NULL DEFAULT 0,
        balance_after numeric(12,3) NOT NULL DEFAULT 0,
        source_type varchar(80) NOT NULL,
        source_id uuid,
        source_line_id uuid,
        reference_number varchar(120),
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_item_date ON stock_movements (warehouse_id, item_id, movement_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements (source_type, source_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stock_movements`);
    await queryRunner.query(`DROP TYPE IF EXISTS stock_movement_type_enum`);
  }
}
