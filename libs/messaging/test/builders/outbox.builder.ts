import { createEvent, EventType, type AnyEvent } from '@app/contracts';
import type { EntityManager } from 'typeorm';
import { OutboxEvent } from '../../src/outbox/outbox-event.entity.js';

const ORDER_ID = '7d1e5c2a-4b3f-4e8a-9c1d-2f3a4b5c6d7e';

/** A valid OrderConfirmed for `orderId`, as an HTTP request would cause it. */
export function anEvent(orderId = ORDER_ID, correlationId = 'c-91ab'): AnyEvent {
  return createEvent(EventType.ORDER_CONFIRMED, { orderId }, { correlationId, causationId: null });
}

/** The outbox row the relay reads for `event`. */
export function anOutboxRow(
  event: AnyEvent = anEvent(),
  overrides: Partial<OutboxEvent> = {},
): OutboxEvent {
  return Object.assign(new OutboxEvent(), {
    id: event.eventId,
    topic: 'orders.events',
    messageKey: event.aggregateId,
    eventType: event.eventType,
    payload: event,
    createdAt: new Date('2026-11-26T10:00:00.000Z'),
    publishedAt: null,
    attempts: 0,
    ...overrides,
  });
}

/** Stands in for a transaction's EntityManager: tests only check it is passed along. */
export const aManager = (): EntityManager => ({ name: 'manager' }) as unknown as EntityManager;
