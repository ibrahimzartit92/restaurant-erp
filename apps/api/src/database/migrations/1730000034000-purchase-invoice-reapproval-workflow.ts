import { MigrationInterface, QueryRunner } from 'typeorm';

export class PurchaseInvoiceReapprovalWorkflow1730000034000 implements MigrationInterface {
  name = 'PurchaseInvoiceReapprovalWorkflow1730000034000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE purchase_invoice_status ADD VALUE 'reopened';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_invoices
        ADD COLUMN IF NOT EXISTS modified_after_approval boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS approval_revision integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS approved_snapshot jsonb,
        ADD COLUMN IF NOT EXISTS approval_modification_log jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_invoices
        DROP COLUMN IF EXISTS approval_modification_log,
        DROP COLUMN IF EXISTS approved_snapshot,
        DROP COLUMN IF EXISTS approval_revision,
        DROP COLUMN IF EXISTS modified_after_approval
    `);
  }
}
