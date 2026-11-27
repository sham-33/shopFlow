import type { AnyEvent } from '@app/contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * An event waiting to go to Kafka (docs/plan.md, section 7.1). Written in the
 * same database transaction as the business change, so the change and its event
 * are saved together or not at all. The relay sends it afterwards.
 */
@Entity({ name: 'outbox_events' })
// The relay only reads unsent rows, so the index holds only those and stays small.
@Index('idx_outbox_events_unpublished', ['createdAt'], { where: '"published_at" IS NULL' })
export class OutboxEvent {
  /** The event's own eventId. */
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'pk_outbox_events' })
  public id: string;

  @Column({ type: 'varchar', length: 100 })
  public topic: string;

  /** The Kafka message key: the order or product the event is about. */
  @Column({ name: 'message_key', type: 'varchar', length: 100 })
  public messageKey: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  public eventType: string;

  /** The whole event envelope, exactly as it is sent. */
  @Column({ type: 'jsonb' })
  public payload: AnyEvent;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;

  /** Null until Kafka has the event. */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  public publishedAt: Date | null;

  /** How many times sending it failed. */
  @Column({ type: 'int', default: 0 })
  public attempts: number;
}
