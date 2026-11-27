import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOutboxAndProcessedEvents1795760937731 implements MigrationInterface {
  name = 'AddOutboxAndProcessedEvents1795760937731';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "processed_events" ("event_id" uuid NOT NULL, "consumer_name" character varying(100) NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_processed_events" PRIMARY KEY ("event_id", "consumer_name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_events" ("id" uuid NOT NULL, "topic" character varying(100) NOT NULL, "message_key" character varying(100) NOT NULL, "event_type" character varying(100) NOT NULL, "payload" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', CONSTRAINT "pk_outbox_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outbox_events_unpublished" ON "outbox_events"  ("created_at") WHERE "published_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_outbox_events_unpublished"`);
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP TABLE "processed_events"`);
  }
}
