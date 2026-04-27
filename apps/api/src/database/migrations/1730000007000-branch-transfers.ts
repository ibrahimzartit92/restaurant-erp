import { MigrationInterface, QueryRunner } from 'typeorm';

export class BranchTransfers1730000007000 implements MigrationInterface {
  name = 'BranchTransfers1730000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE branch_transfer_status AS ENUM (
        'draft',
        'completed',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE branch_transfers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_number varchar(50) NOT NULL UNIQUE,
        transfer_date date NOT NULL,
        from_branch_id uuid NOT NULL REFERENCES branches(id),
        to_branch_id uuid NOT NULL REFERENCES branches(id),
        from_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        to_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
        status branch_transfer_status NOT NULL DEFAULT 'completed',
        total_cost_amount numeric(12, 2) NOT NULL DEFAULT 0,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE branch_transfer_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_transfer_id uuid NOT NULL REFERENCES branch_transfers(id) ON DELETE CASCADE,
        item_id uuid NOT NULL REFERENCES items(id),
        quantity numeric(12, 3) NOT NULL,
        unit_cost numeric(12, 2) NOT NULL,
        line_total numeric(12, 2) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX idx_branch_transfers_transfer_date ON branch_transfers(transfer_date)');
    await queryRunner.query('CREATE INDEX idx_branch_transfers_from_branch_id ON branch_transfers(from_branch_id)');
    await queryRunner.query('CREATE INDEX idx_branch_transfers_to_branch_id ON branch_transfers(to_branch_id)');
    await queryRunner.query('CREATE INDEX idx_branch_transfer_items_transfer_id ON branch_transfer_items(branch_transfer_id)');
    await queryRunner.query('CREATE INDEX idx_branch_transfer_items_item_id ON branch_transfer_items(item_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_branch_transfer_items_item_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_branch_transfer_items_transfer_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_branch_transfers_to_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_branch_transfers_from_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_branch_transfers_transfer_date');
    await queryRunner.query('DROP TABLE branch_transfer_items');
    await queryRunner.query('DROP TABLE branch_transfers');
    await queryRunner.query('DROP TYPE branch_transfer_status');
  }
}
