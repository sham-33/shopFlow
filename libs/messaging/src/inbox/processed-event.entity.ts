import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * The events a consumer has already handled (docs/plan.md, section 7.2). The
 * primary key makes "handled twice" impossible: the second insert is a conflict.
 */
@Entity({ name: 'processed_events' })
export class ProcessedEvent {
  @PrimaryColumn({
    name: 'event_id',
    type: 'uuid',
    primaryKeyConstraintName: 'pk_processed_events',
  })
  public eventId: string;

  /** The handler or consumer group that handled it: one event may be read by several. */
  @PrimaryColumn({
    name: 'consumer_name',
    type: 'varchar',
    length: 100,
    primaryKeyConstraintName: 'pk_processed_events',
  })
  public consumerName: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  public processedAt: Date;
}
