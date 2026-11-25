import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795602189440 implements MigrationInterface {
  name = 'InitialSchema1795602189440';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_catalog" ("product_id" uuid NOT NULL, "sku" character varying(64) NOT NULL, "name" character varying(200) NOT NULL, "price" numeric(12,2) NOT NULL, "active" boolean NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_product_catalog_sku" UNIQUE ("sku"), CONSTRAINT "chk_product_catalog_price_not_negative" CHECK ("price" >= 0), CONSTRAINT "pk_product_catalog" PRIMARY KEY ("product_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "coupons" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(20) NOT NULL, "type" character varying(10) NOT NULL, "percent_off" smallint, "amount_off" numeric(12,2), "min_order_amount" numeric(12,2) NOT NULL DEFAULT '0', "expires_at" TIMESTAMP WITH TIME ZONE, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_coupons_code" UNIQUE ("code"), CONSTRAINT "chk_coupons_min_order_amount_not_negative" CHECK ("min_order_amount" >= 0), CONSTRAINT "chk_coupons_discount" CHECK (("type" = 'PERCENTAGE' AND "percent_off" IS NOT NULL AND "percent_off" BETWEEN 1 AND 100 AND "amount_off" IS NULL) OR ("type" = 'FLAT' AND "amount_off" IS NOT NULL AND "amount_off" > 0 AND "percent_off" IS NULL) OR ("type" = 'BOGO' AND "percent_off" IS NULL AND "amount_off" IS NULL)), CONSTRAINT "chk_coupons_type" CHECK ("type" IN ('PERCENTAGE', 'FLAT', 'BOGO')), CONSTRAINT "pk_coupons" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_status_history" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "from_status" character varying(20), "to_status" character varying(20) NOT NULL, "reason" character varying(200), "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_order_status_history_to_status" CHECK ("to_status" IN ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED')), CONSTRAINT "chk_order_status_history_from_status" CHECK ("from_status" IS NULL OR "from_status" IN ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED')), CONSTRAINT "pk_order_status_history" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "customer_id" uuid NOT NULL, "status" character varying(20) NOT NULL, "subtotal" numeric(12,2) NOT NULL, "discount_amount" numeric(12,2) NOT NULL, "total_amount" numeric(12,2) NOT NULL, "currency" character(3) NOT NULL, "payment_method" character varying(10) NOT NULL, "coupon_code" character varying(20), "cancel_reason" character varying(30), "idempotency_key" character varying(100) NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_orders_idempotency_key" UNIQUE ("idempotency_key"), CONSTRAINT "chk_orders_amounts" CHECK ("subtotal" >= 0 AND "discount_amount" >= 0 AND "discount_amount" <= "subtotal" AND "total_amount" = "subtotal" - "discount_amount"), CONSTRAINT "chk_orders_cancel_reason" CHECK ("cancel_reason" IS NULL OR "cancel_reason" IN ('CUSTOMER_REQUEST', 'PAYMENT_FAILED')), CONSTRAINT "chk_orders_payment_method" CHECK ("payment_method" IN ('WALLET', 'CARD', 'UPI')), CONSTRAINT "chk_orders_status" CHECK ("status" IN ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED')), CONSTRAINT "pk_orders" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_customer_id_created_at" ON "orders"  ("customer_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "sku" character varying(64) NOT NULL, "product_name" character varying(200) NOT NULL, "quantity" integer NOT NULL, "unit_price" numeric(12,2) NOT NULL, CONSTRAINT "chk_order_items_unit_price_not_negative" CHECK ("unit_price" >= 0), CONSTRAINT "chk_order_items_quantity_positive" CHECK ("quantity" > 0), CONSTRAINT "pk_order_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_items_order_id" ON "order_items"  ("order_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" ADD CONSTRAINT "fk_order_status_history_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "fk_order_items_order"`);
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "fk_order_status_history_order"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_order_items_order_id"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_customer_id_created_at"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP INDEX "public"."idx_order_status_history_order_id"`);
    await queryRunner.query(`DROP TABLE "order_status_history"`);
    await queryRunner.query(`DROP TABLE "coupons"`);
    await queryRunner.query(`DROP TABLE "product_catalog"`);
  }
}
