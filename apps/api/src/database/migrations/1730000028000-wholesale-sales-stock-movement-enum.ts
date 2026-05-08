import { MigrationInterface, QueryRunner } from 'typeorm';

export class WholesaleSalesStockMovementEnum1730000028000 implements MigrationInterface {
  name = 'WholesaleSalesStockMovementEnum1730000028000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type_enum') THEN
          ALTER TYPE stock_movement_type_enum ADD VALUE IF NOT EXISTS 'wholesale_sale_out';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be removed safely in a generic down migration.
  }
}
