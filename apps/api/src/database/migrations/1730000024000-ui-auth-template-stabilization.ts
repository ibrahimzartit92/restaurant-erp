import { MigrationInterface, QueryRunner } from 'typeorm';

export class UiAuthTemplateStabilization1730000024000 implements MigrationInterface {
  name = 'UiAuthTemplateStabilization1730000024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE expense_templates
      ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE expense_templates DROP COLUMN IF EXISTS is_recurring`);
  }
}
