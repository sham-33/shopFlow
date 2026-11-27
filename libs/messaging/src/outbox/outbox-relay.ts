import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MESSAGE_HEADERS, OUTBOX_BATCH_SIZE, OUTBOX_RETENTION_MS } from '../constants.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
  type OutgoingMessage,
} from '../kafka/event-publisher.js';
import type { OutboxEvent } from './outbox-event.entity.js';
import { OUTBOX_REPOSITORY, type OutboxRepository } from './outbox.repository.js';

/**
 * Sends outbox events to Kafka. It may send an event twice, if the service
 * crashes after Kafka has it but before the row is marked published. That is
 * fine: consumers skip duplicates (IdempotentConsumer).
 */
@Injectable()
export class OutboxRelay {
  constructor(
    @Inject(OUTBOX_REPOSITORY) private readonly outbox: OutboxRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Sends one batch and returns how many events it sent. The batch is claimed,
   * sent and marked in one transaction: if Kafka refuses, the rows stay
   * unpublished for the next run and this throws.
   */
  public async relayBatch(): Promise<number> {
    let claimedIds: string[] = [];
    try {
      return await this.dataSource.transaction(async (manager) => {
        const events = await this.outbox.claimUnpublished(OUTBOX_BATCH_SIZE, manager);
        if (events.length === 0) {
          return 0;
        }
        claimedIds = events.map(({ id }) => id);
        await this.publisher.publish(events.map(toMessage));
        await this.outbox.markPublished(claimedIds, manager);
        return events.length;
      });
    } catch (error) {
      await this.countFailedAttempt(claimedIds);
      throw error;
    }
  }

  /** Deletes events published more than the retention time ago. Returns how many. */
  public async cleanup(now: Date = new Date()): Promise<number> {
    return this.outbox.deletePublishedBefore(new Date(now.getTime() - OUTBOX_RETENTION_MS));
  }

  /** Counting is best effort: it must never hide the error that caused it. */
  private async countFailedAttempt(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    try {
      await this.outbox.recordFailedAttempt(ids);
    } catch {
      // The relay's caller logs the original error; the next run counts again.
    }
  }
}

function toMessage(event: OutboxEvent): OutgoingMessage {
  const { eventId, eventType, correlationId } = event.payload;
  return {
    topic: event.topic,
    key: event.messageKey,
    value: JSON.stringify(event.payload),
    headers: {
      [MESSAGE_HEADERS.EVENT_ID]: eventId,
      [MESSAGE_HEADERS.EVENT_TYPE]: eventType,
      [MESSAGE_HEADERS.CORRELATION_ID]: correlationId,
    },
  };
}
