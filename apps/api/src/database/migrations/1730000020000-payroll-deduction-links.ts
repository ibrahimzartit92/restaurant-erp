import { MigrationInterface, QueryRunner } from 'typeorm';

export class PayrollDeductionLinks1730000020000 implements MigrationInterface {
  name = 'PayrollDeductionLinks1730000020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_status character varying(30) NOT NULL DEFAULT 'unpaid'`);
    await queryRunner.query(`
      UPDATE payrolls
      SET payment_status = CASE
        WHEN COALESCE(paid_amount, 0) <= 0 THEN 'unpaid'
        WHEN COALESCE(paid_amount, 0) >= COALESCE(net_salary, 0) THEN 'paid'
        ELSE 'partially_paid'
      END
    `);

    await queryRunner.query(`ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS payroll_record_id uuid`);
    await queryRunner.query(`ALTER TABLE employee_penalties ADD COLUMN IF NOT EXISTS payroll_record_id uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_advances_payroll_record_id ON employee_advances (payroll_record_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_employee_penalties_payroll_record_id ON employee_penalties (payroll_record_id)`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_advances_payroll_record_id'
        ) THEN
          ALTER TABLE employee_advances
          ADD CONSTRAINT FK_employee_advances_payroll_record_id
          FOREIGN KEY (payroll_record_id) REFERENCES payrolls(id) ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_employee_penalties_payroll_record_id'
        ) THEN
          ALTER TABLE employee_penalties
          ADD CONSTRAINT FK_employee_penalties_payroll_record_id
          FOREIGN KEY (payroll_record_id) REFERENCES payrolls(id) ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE employee_penalties DROP CONSTRAINT IF EXISTS FK_employee_penalties_payroll_record_id`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP CONSTRAINT IF EXISTS FK_employee_advances_payroll_record_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_employee_penalties_payroll_record_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_employee_advances_payroll_record_id`);
    await queryRunner.query(`ALTER TABLE employee_penalties DROP COLUMN IF EXISTS payroll_record_id`);
    await queryRunner.query(`ALTER TABLE employee_advances DROP COLUMN IF EXISTS payroll_record_id`);
    await queryRunner.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS payment_status`);
  }
}
