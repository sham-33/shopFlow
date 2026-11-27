import { EventType, type ServiceName } from './enums.js';
import type {
  StockReleasedPayload,
  StockReservationFailedPayload,
  StockReservedPayload,
} from './payloads/inventory.payloads.js';
import type {
  OrderCancelledPayload,
  OrderConfirmedPayload,
  OrderCreatedPayload,
  OrderPaymentRequestedPayload,
} from './payloads/order.payloads.js';
import type {
  PaymentCompletedPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
} from './payloads/payment.payloads.js';
import type { ProductUpdatedPayload } from './payloads/product.payloads.js';

/** The payload class of each event type. */
export interface EventPayloads {
  [EventType.ORDER_CREATED]: OrderCreatedPayload;
  [EventType.ORDER_PAYMENT_REQUESTED]: OrderPaymentRequestedPayload;
  [EventType.ORDER_CONFIRMED]: OrderConfirmedPayload;
  [EventType.ORDER_CANCELLED]: OrderCancelledPayload;
  [EventType.STOCK_RESERVED]: StockReservedPayload;
  [EventType.STOCK_RESERVATION_FAILED]: StockReservationFailedPayload;
  [EventType.STOCK_RELEASED]: StockReleasedPayload;
  [EventType.PAYMENT_COMPLETED]: PaymentCompletedPayload;
  [EventType.PAYMENT_FAILED]: PaymentFailedPayload;
  [EventType.PAYMENT_REFUNDED]: PaymentRefundedPayload;
  [EventType.PRODUCT_UPDATED]: ProductUpdatedPayload;
}

/**
 * The outer shape of every message (docs/plan.md, section 4.5). Only the
 * payload differs between event types. Build one with createEvent() and read
 * one with parseEvent().
 */
export interface EventEnvelope<T extends EventType = EventType> {
  /** Unique per event. Consumers use it to skip duplicates. */
  readonly eventId: string;
  readonly eventType: T;
  /** The payload's version. Fields may be added within a version, never renamed or removed. */
  readonly eventVersion: number;
  /** When it happened: an ISO 8601 timestamp in UTC. */
  readonly occurredAt: string;
  /** The order (or product) the event is about. Also the Kafka message key. */
  readonly aggregateId: string;
  /** The same for every event of one order journey, so one search finds it in all 3 services' logs. */
  readonly correlationId: string;
  /** The eventId of the event that caused this one; null when an HTTP request did. */
  readonly causationId: string | null;
  readonly producer: ServiceName;
  readonly payload: EventPayloads[T];
}

/** Any event. Checking `eventType` narrows `payload` to that event's class. */
export type AnyEvent = { [T in EventType]: EventEnvelope<T> }[EventType];
