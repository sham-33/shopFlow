import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795421247569 implements MigrationInterface {
  name = 'InitialSchema1795421247569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stock" ("product_id" uuid NOT NULL, "available_qty" integer NOT NULL DEFAULT '0', "reserved_qty" integer NOT NULL DEFAULT '0', "version" integer NOT NULL, CONSTRAINT "chk_stock_reserved_qty_not_negative" CHECK ("reserved_qty" >= 0), CONSTRAINT "chk_stock_available_qty_not_negative" CHECK ("available_qty" >= 0), CONSTRAINT "pk_stock" PRIMARY KEY ("product_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sku" character varying(64) NOT NULL, "name" character varying(200) NOT NULL, "price" numeric(12,2) NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_products_sku" UNIQUE ("sku"), CONSTRAINT "chk_products_price_not_negative" CHECK ("price" >= 0), CONSTRAINT "pk_products" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock" ADD CONSTRAINT "fk_stock_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock" DROP CONSTRAINT "fk_stock_product"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "stock"`);
  }
}
