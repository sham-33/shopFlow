import { EVENT_DEFINITIONS, type AnyEvent } from '@app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { OUTBOX_REPOSITORY, type OutboxRepository } from './outbox.repository.js';

/**
 * How a service publishes an event: it adds the event to the outbox inside the
 * transaction of its business change. It never talks to Kafka itself.
 */
@Injectable()
export class OutboxService {
  constructor(@Inject(OUTBOX_REPOSITORY) private readonly outbox: OutboxRepository) {}

  /**
   * @example
   * await this.dataSource.transaction(async (manager) => {
   *   await this.orders.insert(order, manager);
   *   await this.outbox.add(manager, createEvent(EventType.ORDER_CREATED, payload, context));
   * });
   */
  public async add(manager: EntityManager, event: AnyEvent): Promise<void> {
    await this.outbox.add(
      {
        id: event.eventId,
        topic: EVENT_DEFINITIONS[event.eventType].topic,
        messageKey: event.aggregateId,
        eventType: event.eventType,
        payload: event,
      },
      manager,
    );
  }
}
