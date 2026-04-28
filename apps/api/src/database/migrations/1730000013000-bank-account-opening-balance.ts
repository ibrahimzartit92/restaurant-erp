import { MigrationInterface, QueryRunner } from 'typeorm';

export class BankAccountOpeningBalance1730000013000 implements MigrationInterface {
  name = 'BankAccountOpeningBalance1730000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS opening_balance numeric(12, 2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query('ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS opening_balance_date date');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE bank_accounts DROP COLUMN IF EXISTS opening_balance_date');
    await queryRunner.query('ALTER TABLE bank_accounts DROP COLUMN IF EXISTS opening_balance');
  }
}
