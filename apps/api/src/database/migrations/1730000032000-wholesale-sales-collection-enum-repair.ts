import { MigrationInterface, QueryRunner } from 'typeorm';

export class WholesaleSalesCollectionEnumRepair1730000032000 implements MigrationInterface {
  name = 'WholesaleSalesCollectionEnumRepair1730000032000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drawer_transaction_type') THEN
          ALTER TYPE drawer_transaction_type ADD VALUE IF NOT EXISTS 'wholesale_sales_cash_collection';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bank_account_transaction_type') THEN
          ALTER TYPE bank_account_transaction_type ADD VALUE IF NOT EXISTS 'wholesale_sales_receipt_bank';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values are intentionally left in place.
  }
}
