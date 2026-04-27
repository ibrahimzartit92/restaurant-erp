import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeesPayrollAttendance1730000009000 implements MigrationInterface {
  name = 'EmployeesPayrollAttendance1730000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_number" character varying(50) NOT NULL,
        "full_name" character varying(180) NOT NULL,
        "phone" character varying(50),
        "job_title" character varying(120),
        "default_branch_id" uuid,
        "hire_date" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_employees_employee_number" UNIQUE ("employee_number"),
        CONSTRAINT "PK_employees_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "employee_advances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid NOT NULL,
        "advance_date" date NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "payroll_month" integer,
        "payroll_year" integer,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_advances_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "employee_penalties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid NOT NULL,
        "penalty_date" date NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "reason" character varying(500),
        "payroll_month" integer,
        "payroll_year" integer,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_penalties_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "payrolls" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid NOT NULL,
        "payroll_month" integer NOT NULL,
        "payroll_year" integer NOT NULL,
        "base_salary" numeric(12,2) NOT NULL,
        "allowances_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "advances_deduction_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "penalties_deduction_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "other_deduction_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "net_salary" numeric(12,2) NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payroll_employee_month_year" UNIQUE ("employee_id", "payroll_month", "payroll_year"),
        CONSTRAINT "PK_payrolls_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "attendance_files" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid,
        "branch_id" uuid,
        "month" integer NOT NULL,
        "year" integer NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_path" character varying(500) NOT NULL,
        "file_type" character varying(50) NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_files_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_employees_default_branch_id" ON "employees" ("default_branch_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_employee_advances_employee_id" ON "employee_advances" ("employee_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_employee_penalties_employee_id" ON "employee_penalties" ("employee_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_payrolls_employee_id" ON "payrolls" ("employee_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_attendance_files_employee_id" ON "attendance_files" ("employee_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_attendance_files_branch_id" ON "attendance_files" ("branch_id") `);
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD CONSTRAINT "FK_employees_default_branch_id" FOREIGN KEY ("default_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "employee_advances"
      ADD CONSTRAINT "FK_employee_advances_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "employee_penalties"
      ADD CONSTRAINT "FK_employee_penalties_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "payrolls"
      ADD CONSTRAINT "FK_payrolls_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "attendance_files"
      ADD CONSTRAINT "FK_attendance_files_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "attendance_files"
      ADD CONSTRAINT "FK_attendance_files_branch_id" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "attendance_files" DROP CONSTRAINT "FK_attendance_files_branch_id"`);
    await queryRunner.query(`ALTER TABLE "attendance_files" DROP CONSTRAINT "FK_attendance_files_employee_id"`);
    await queryRunner.query(`ALTER TABLE "payrolls" DROP CONSTRAINT "FK_payrolls_employee_id"`);
    await queryRunner.query(`ALTER TABLE "employee_penalties" DROP CONSTRAINT "FK_employee_penalties_employee_id"`);
    await queryRunner.query(`ALTER TABLE "employee_advances" DROP CONSTRAINT "FK_employee_advances_employee_id"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_default_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_attendance_files_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_attendance_files_employee_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payrolls_employee_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_employee_penalties_employee_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_employee_advances_employee_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_employees_default_branch_id"`);
    await queryRunner.query(`DROP TABLE "attendance_files"`);
    await queryRunner.query(`DROP TABLE "payrolls"`);
    await queryRunner.query(`DROP TABLE "employee_penalties"`);
    await queryRunner.query(`DROP TABLE "employee_advances"`);
    await queryRunner.query(`DROP TABLE "employees"`);
  }
}
