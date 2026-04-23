import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuthAccessFoundation1730000000000 implements MigrationInterface {
  name = 'InitialAuthAccessFoundation1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(80) NOT NULL UNIQUE,
        description varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE branches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(160) NOT NULL,
        code varchar(50) NOT NULL UNIQUE,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name varchar(160) NOT NULL,
        email varchar(180) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        role_id uuid NOT NULL REFERENCES roles(id),
        branch_id uuid REFERENCES branches(id),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX idx_users_role_id ON users(role_id)');
    await queryRunner.query('CREATE INDEX idx_users_branch_id ON users(branch_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_branch_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_role_id');
    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('DROP TABLE branches');
    await queryRunner.query('DROP TABLE roles');
  }
}
