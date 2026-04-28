import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeAdvanceDrawerLink1730000015000 implements MigrationInterface {
  name = 'EmployeeAdvanceDrawerLink1730000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum
          WHERE enumlabel = 'employee_advance_cash'
            AND enumtypid = 'drawer_transaction_type'::regtype
        ) THEN
          ALTER TYPE drawer_transaction_type ADD VALUE 'employee_advance_cash';
        END IF;
      END $$;
    `);
    await queryRunner.query('ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS drawer_id uuid');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_employee_advances_drawer_id'
        ) THEN
          ALTER TABLE employee_advances
          ADD CONSTRAINT fk_employee_advances_drawer_id
          FOREIGN KEY (drawer_id) REFERENCES drawers(id);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE employee_advances DROP CONSTRAINT IF EXISTS fk_employee_advances_drawer_id');
    await queryRunner.query('ALTER TABLE employee_advances DROP COLUMN IF EXISTS drawer_id');
  }
}
