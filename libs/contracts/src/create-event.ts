import { randomUUID } from 'node:crypto';
import type { EventEnvelope, EventPayloads } from './envelope.js';
import type { EventType } from './enums.js';
import { EVENT_DEFINITIONS } from './event-definitions.js';
import { validateEnvelope, validatePayload } from './validation.js';

/** What led to an event. */
export interface EventContext {
  /** Carried unchanged from the HTTP request or the event that led here. */
  readonly correlationId: string;
  /** The eventId of the event that caused this one; null when an HTTP request did. */
  readonly causationId: string | null;
}

/**
 * A new event, ready to be written to the outbox. Its version, producer and
 * key come from the event's definition, so they cannot be wrong.
 *
 * The event is checked here as well as by consumers: a bad event fails in the
 * service that wrote it, instead of landing in every consumer's dead-letter
 * topic. Throws InvalidEventError.
 */
export function createEvent<T extends EventType>(
  eventType: T,
  payload: EventPayloads[T],
  context: EventContext,
): EventEnvelope<T> {
  const definition = EVENT_DEFINITIONS[eventType];
  const validPayload = validatePayload(eventType, payload);
  const event: EventEnvelope<T> = {
    eventId: randomUUID(),
    eventType,
    eventVersion: definition.version,
    occurredAt: new Date().toISOString(),
    aggregateId: definition.aggregateIdOf(validPayload),
    correlationId: context.correlationId,
    causationId: context.causationId,
    producer: definition.producer,
    payload: validPayload,
  };
  validateEnvelope(event);
  return event;
}

/** The context for an event that `cause` led to: the same journey, caused by `cause`. */
export function causedBy(cause: EventEnvelope): EventContext {
  return { correlationId: cause.correlationId, causationId: cause.eventId };
}
