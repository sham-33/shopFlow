import type { AnyEvent, EventEnvelope } from './envelope.js';
import type { EventType } from './enums.js';
import { EVENT_DEFINITIONS } from './event-definitions.js';
import { InvalidEventError } from './invalid-event.error.js';
import { type EnvelopeFields, validateEnvelope, validatePayload } from './validation.js';

/**
 * Reads a Kafka message value as an event, checking the envelope and the
 * payload against the contract. Fields this version does not know are dropped.
 *
 * Throws InvalidEventError for anything else. Retrying cannot fix such a
 * message, so the consumer sends it to its dead-letter topic.
 */
export function parseEvent(value: Buffer | string | null | undefined): AnyEvent {
  const fields = validateEnvelope(parseJsonObject(value));
  return checkAgainstDefinition(fields.eventType, fields);
}

function parseJsonObject(value: Buffer | string | null | undefined): object {
  if (value === null || value === undefined || value.length === 0) {
    throw new InvalidEventError('The message has no value');
  }
  let json: unknown;
  try {
    json = JSON.parse(value.toString());
  } catch {
    throw new InvalidEventError('The message is not valid JSON');
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new InvalidEventError('The message is not a JSON object');
  }
  return json;
}

function checkAgainstDefinition<T extends EventType>(
  eventType: T,
  fields: EnvelopeFields,
): AnyEvent {
  const definition = EVENT_DEFINITIONS[eventType];
  if (fields.eventVersion !== definition.version) {
    throw new InvalidEventError(
      `${eventType} version ${fields.eventVersion} is not supported; this service reads version ${definition.version}`,
    );
  }
  if (fields.producer !== definition.producer) {
    throw new InvalidEventError(
      `${eventType} is written by ${definition.producer}, but this one came from ${fields.producer}`,
    );
  }

  const payload = validatePayload(eventType, fields.payload);
  const aggregateId = definition.aggregateIdOf(payload);
  if (fields.aggregateId !== aggregateId) {
    throw new InvalidEventError(
      `aggregateId ${fields.aggregateId} does not match the payload, which is about ${aggregateId}`,
    );
  }

  const event: EventEnvelope<T> = {
    eventId: fields.eventId,
    eventType,
    eventVersion: fields.eventVersion,
    occurredAt: fields.occurredAt,
    aggregateId,
    correlationId: fields.correlationId,
    causationId: fields.causationId,
    producer: fields.producer,
    payload,
  };
  // TypeScript cannot see that eventType and payload match, but they do: the
  // payload was just validated against eventType's own class.
  return event as AnyEvent;
}
