import type { ServiceName } from './enums.js';

/**
 * The business event topics (docs/plan.md, section 4.1). One topic per area,
 * keyed by order ID (products by product ID), so all events of one order are
 * read in the order they were written.
 *
 * Auto-creation is off in the broker: a new topic must also be added to
 * docker/kafka/create-topics.sh.
 */
export enum Topic {
  ORDERS = 'orders.events',
  INVENTORY = 'inventory.events',
  PAYMENTS = 'payments.events',
  /** Compacted: Kafka keeps the latest event per product. */
  PRODUCTS = 'products.events',
}

/** Where a service puts its own failed messages to try them again after a delay. */
export function retryTopic(service: ServiceName): `${ServiceName}.retry` {
  return `${service}.retry`;
}

/** Where a service puts messages that failed every retry, or can never succeed. */
export function deadLetterTopic(service: ServiceName): `${ServiceName}.dlt` {
  return `${service}.dlt`;
}
