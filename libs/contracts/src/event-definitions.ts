import type { EventPayloads } from './envelope.js';
import { EventType, ServiceName } from './enums.js';
import {
  StockReleasedPayload,
  StockReservationFailedPayload,
  StockReservedPayload,
} from './payloads/inventory.payloads.js';
import {
  OrderCancelledPayload,
  OrderConfirmedPayload,
  OrderCreatedPayload,
  type OrderEventPayload,
  OrderPaymentRequestedPayload,
} from './payloads/order.payloads.js';
import {
  PaymentCompletedPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
} from './payloads/payment.payloads.js';
import { ProductUpdatedPayload } from './payloads/product.payloads.js';
import { Topic } from './topics.js';

/** Everything the services agree on about one event type. */
export interface EventDefinition<T extends EventType> {
  readonly topic: Topic;
  /** The only service that writes it. */
  readonly producer: ServiceName;
  /** The payload version written and read today. */
  readonly version: number;
  /** The payload class, with its validation rules. */
  readonly payload: new () => EventPayloads[T];
  /** The aggregate the event is about, which is also the message key: one order's events share a partition. */
  readonly aggregateIdOf: (payload: EventPayloads[T]) => string;
}

const orderIdOf = (payload: OrderEventPayload): string => payload.orderId;

/**
 * The event catalog (docs/plan.md, section 4.6). Typed by EventType, so an
 * event type without a definition does not compile.
 */
export const EVENT_DEFINITIONS: {
  readonly [T in EventType]: EventDefinition<T>;
} = {
  [EventType.ORDER_CREATED]: {
    topic: Topic.ORDERS,
    producer: ServiceName.ORDER,
    version: 1,
    payload: OrderCreatedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.ORDER_PAYMENT_REQUESTED]: {
    topic: Topic.ORDERS,
    producer: ServiceName.ORDER,
    version: 1,
    payload: OrderPaymentRequestedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.ORDER_CONFIRMED]: {
    topic: Topic.ORDERS,
    producer: ServiceName.ORDER,
    version: 1,
    payload: OrderConfirmedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.ORDER_CANCELLED]: {
    topic: Topic.ORDERS,
    producer: ServiceName.ORDER,
    version: 1,
    payload: OrderCancelledPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.STOCK_RESERVED]: {
    topic: Topic.INVENTORY,
    producer: ServiceName.INVENTORY,
    version: 1,
    payload: StockReservedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.STOCK_RESERVATION_FAILED]: {
    topic: Topic.INVENTORY,
    producer: ServiceName.INVENTORY,
    version: 1,
    payload: StockReservationFailedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.STOCK_RELEASED]: {
    topic: Topic.INVENTORY,
    producer: ServiceName.INVENTORY,
    version: 1,
    payload: StockReleasedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.PAYMENT_COMPLETED]: {
    topic: Topic.PAYMENTS,
    producer: ServiceName.PAYMENT,
    version: 1,
    payload: PaymentCompletedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.PAYMENT_FAILED]: {
    topic: Topic.PAYMENTS,
    producer: ServiceName.PAYMENT,
    version: 1,
    payload: PaymentFailedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.PAYMENT_REFUNDED]: {
    topic: Topic.PAYMENTS,
    producer: ServiceName.PAYMENT,
    version: 1,
    payload: PaymentRefundedPayload,
    aggregateIdOf: orderIdOf,
  },
  [EventType.PRODUCT_UPDATED]: {
    topic: Topic.PRODUCTS,
    producer: ServiceName.INVENTORY,
    version: 1,
    payload: ProductUpdatedPayload,
    aggregateIdOf: (payload) => payload.productId,
  },
};
