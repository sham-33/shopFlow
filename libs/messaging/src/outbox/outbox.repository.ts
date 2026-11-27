import type { AnyEvent } from '@app/contracts';
import type { EntityManager } from 'typeorm';
import type { OutboxEvent } from './outbox-event.entity.js';

/** What to store for a new event. */
export interface NewOutboxEvent {
  readonly id: string;
  readonly topic: string;
  readonly messageKey: string;
  readonly eventType: string;
  readonly payload: AnyEvent;
}

export interface OutboxRepository {
  /** Pass the manager of the business transaction, so the event is saved with the change. */
  add(event: NewOutboxEvent, manager?: EntityManager): Promise<void>;

  /**
   * The oldest unpublished events, up to `limit`, locked until the transaction
   * ends. Events another transaction has locked are skipped, so two copies of a
   * service never send the same event.
   */
  claimUnpublished(limit: number, manager: EntityManager): Promise<OutboxEvent[]>;

  markPublished(ids: readonly string[], manager: EntityManager): Promise<void>;

  /** Adds 1 to `attempts`. Runs outside the failed transaction, so it is kept. */
  recordFailedAttempt(ids: readonly string[]): Promise<void>;

  /** Deletes events published before `cutoff` and returns how many. */
  deletePublishedBefore(cutoff: Date): Promise<number>;
}

export const OUTBOX_REPOSITORY = Symbol('OUTBOX_REPOSITORY');
