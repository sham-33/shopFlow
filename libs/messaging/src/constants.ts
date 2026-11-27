// Fixed values of the messaging library.

// Outbox (docs/plan.md, section 7.1)

/** How often the relay looks for unpublished events. */
export const OUTBOX_RELAY_INTERVAL_MS = 500;

/** Most events the relay claims and publishes in one go. */
export const OUTBOX_BATCH_SIZE = 100;

/** Published events are kept this long for debugging, then deleted. */
export const OUTBOX_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** How often published events older than the retention time are deleted. */
export const OUTBOX_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Kafka messages

/** Headers copied from the envelope, so tools such as AKHQ show them without opening the JSON. */
export const MESSAGE_HEADERS = {
  EVENT_ID: 'x-event-id',
  EVENT_TYPE: 'x-event-type',
  CORRELATION_ID: 'x-correlation-id',
} as const;

/** `acks: all` (-1): a message counts as sent only when every in-sync replica has it. */
export const PRODUCER_ACKS_ALL = -1;

/** Brokers used outside production when KAFKA_BROKERS is not set (the local Docker Kafka). */
export const LOCAL_KAFKA_BROKERS = 'localhost:9092';

/** Longest to wait for the first broker connection and for each request. */
export const KAFKA_CONNECTION_TIMEOUT_MS = 10_000;
