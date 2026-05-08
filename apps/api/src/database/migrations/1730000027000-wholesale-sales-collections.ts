import { MigrationInterface, QueryRunner } from 'typeorm';

export class WholesaleSalesCollections1730000027000 implements MigrationInterface {
  name = 'WholesaleSalesCollections1730000027000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wholesale_sales_payments_payment_method_enum') THEN
          ALTER TYPE "wholesale_sales_payments_payment_method_enum" ADD VALUE IF NOT EXISTS 'vault';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "wholesale_sales_payments"
      ADD COLUMN IF NOT EXISTS "vault_id" uuid REFERENCES "vaults"("id")
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be removed safely in a generic down migration.
  }
}
