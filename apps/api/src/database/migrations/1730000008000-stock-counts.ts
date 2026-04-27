import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockCounts1730000008000 implements MigrationInterface {
  name = 'StockCounts1730000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."stock_count_status_enum" AS ENUM('draft', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TABLE "stock_counts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "count_number" character varying(50) NOT NULL,
        "branch_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "count_date" date NOT NULL,
        "status" "public"."stock_count_status_enum" NOT NULL DEFAULT 'completed',
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_stock_counts_count_number" UNIQUE ("count_number"),
        CONSTRAINT "PK_stock_counts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "stock_count_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stock_count_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "system_quantity" numeric(12,3) NOT NULL,
        "counted_quantity" numeric(12,3) NOT NULL,
        "difference_quantity" numeric(12,3) NOT NULL,
        "estimated_cost_difference" numeric(12,2) NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_count_items_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_stock_counts_count_date" ON "stock_counts" ("count_date") `);
    await queryRunner.query(`CREATE INDEX "IDX_stock_counts_branch_id" ON "stock_counts" ("branch_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_stock_counts_warehouse_id" ON "stock_counts" ("warehouse_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_stock_count_items_stock_count_id" ON "stock_count_items" ("stock_count_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_stock_count_items_item_id" ON "stock_count_items" ("item_id") `);
    await queryRunner.query(`
      ALTER TABLE "stock_counts"
      ADD CONSTRAINT "FK_stock_counts_branch_id" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_counts"
      ADD CONSTRAINT "FK_stock_counts_warehouse_id" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_count_items"
      ADD CONSTRAINT "FK_stock_count_items_stock_count_id" FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_count_items"
      ADD CONSTRAINT "FK_stock_count_items_item_id" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock_count_items" DROP CONSTRAINT "FK_stock_count_items_item_id"`);
    await queryRunner.query(`ALTER TABLE "stock_count_items" DROP CONSTRAINT "FK_stock_count_items_stock_count_id"`);
    await queryRunner.query(`ALTER TABLE "stock_counts" DROP CONSTRAINT "FK_stock_counts_warehouse_id"`);
    await queryRunner.query(`ALTER TABLE "stock_counts" DROP CONSTRAINT "FK_stock_counts_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_stock_count_items_item_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_stock_count_items_stock_count_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_stock_counts_warehouse_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_stock_counts_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_stock_counts_count_date"`);
    await queryRunner.query(`DROP TABLE "stock_count_items"`);
    await queryRunner.query(`DROP TABLE "stock_counts"`);
    await queryRunner.query(`DROP TYPE "public"."stock_count_status_enum"`);
  }
}
