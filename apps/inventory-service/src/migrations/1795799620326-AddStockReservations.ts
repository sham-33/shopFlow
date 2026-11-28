import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockReservations1795799620326 implements MigrationInterface {
  name = 'AddStockReservations1795799620326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stock_reservations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "quantity" integer NOT NULL, "status" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_stock_reservations_order_product" UNIQUE ("order_id", "product_id"), CONSTRAINT "chk_stock_reservations_status" CHECK ("status" IN ('RESERVED', 'COMMITTED', 'RELEASED')), CONSTRAINT "chk_stock_reservations_quantity_positive" CHECK ("quantity" > 0), CONSTRAINT "pk_stock_reservations" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_stock_reservations_product_id" ON "stock_reservations"  ("product_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_reservations" ADD CONSTRAINT "fk_stock_reservations_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_reservations" DROP CONSTRAINT "fk_stock_reservations_product"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_stock_reservations_product_id"`);
    await queryRunner.query(`DROP TABLE "stock_reservations"`);
  }
}
