import type { EventPayloads } from '../../src/envelope.js';
import { CancelReason, EventType, PaymentMethod, ServiceName } from '../../src/enums.js';
import type { EventContext } from '../../src/create-event.js';

export const ORDER_ID = '7d1e5c2a-4b3f-4e8a-9c1d-2f3a4b5c6d7e';
export const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
export const PRODUCT_ID = 'a1000000-0000-4000-8000-000000000001';
export const OTHER_PRODUCT_ID = 'a1000000-0000-4000-8000-000000000002';
export const PAYMENT_ID = 'c3000000-0000-4000-8000-000000000003';
export const EVENT_ID = '5f0c8a2e-1b7d-4c3a-9e21-0d4f6a7b8c90';

/** As an HTTP request would start a journey: a correlation ID, no causing event. */
export const FROM_REQUEST: EventContext = {
  correlationId: 'c-91ab',
  causationId: null,
};

/** A realistic, valid payload for every event type. */
export const VALID_PAYLOADS: { readonly [T in EventType]: EventPayloads[T] } = {
  [EventType.ORDER_CREATED]: {
    orderId: ORDER_ID,
    customerId: CUSTOMER_ID,
    items: [
      { productId: PRODUCT_ID, quantity: 2, unitPrice: 499.5 },
      { productId: OTHER_PRODUCT_ID, quantity: 1, unitPrice: 199.99 },
    ],
    totalAmount: 1079.09,
    currency: 'INR',
    paymentMethod: PaymentMethod.WALLET,
  },
  [EventType.ORDER_PAYMENT_REQUESTED]: {
    orderId: ORDER_ID,
    customerId: CUSTOMER_ID,
    amount: 1079.09,
    currency: 'INR',
    paymentMethod: PaymentMethod.UPI,
  },
  [EventType.ORDER_CONFIRMED]: { orderId: ORDER_ID },
  [EventType.ORDER_CANCELLED]: {
    orderId: ORDER_ID,
    reason: CancelReason.CUSTOMER_REQUEST,
  },
  [EventType.STOCK_RESERVED]: {
    orderId: ORDER_ID,
    reservationIds: [
      'd4000000-0000-4000-8000-000000000001',
      'd4000000-0000-4000-8000-000000000002',
    ],
  },
  [EventType.STOCK_RESERVATION_FAILED]: {
    orderId: ORDER_ID,
    unavailableItems: [{ productId: PRODUCT_ID, requested: 2, available: 1 }],
  },
  [EventType.STOCK_RELEASED]: {
    orderId: ORDER_ID,
    items: [{ productId: PRODUCT_ID, quantity: 2 }],
  },
  [EventType.PAYMENT_COMPLETED]: {
    orderId: ORDER_ID,
    paymentId: PAYMENT_ID,
    amount: 1079.09,
  },
  [EventType.PAYMENT_FAILED]: {
    orderId: ORDER_ID,
    reason: 'INSUFFICIENT_BALANCE',
  },
  [EventType.PAYMENT_REFUNDED]: {
    orderId: ORDER_ID,
    paymentId: PAYMENT_ID,
    amount: 1079.09,
  },
  [EventType.PRODUCT_UPDATED]: {
    productId: PRODUCT_ID,
    sku: 'TSHIRT-RED-M',
    name: 'Red T-shirt (M)',
    price: 499.5,
    active: true,
  },
};

const PRODUCERS: Record<EventType, ServiceName> = {
  [EventType.ORDER_CREATED]: ServiceName.ORDER,
  [EventType.ORDER_PAYMENT_REQUESTED]: ServiceName.ORDER,
  [EventType.ORDER_CONFIRMED]: ServiceName.ORDER,
  [EventType.ORDER_CANCELLED]: ServiceName.ORDER,
  [EventType.STOCK_RESERVED]: ServiceName.INVENTORY,
  [EventType.STOCK_RESERVATION_FAILED]: ServiceName.INVENTORY,
  [EventType.STOCK_RELEASED]: ServiceName.INVENTORY,
  [EventType.PAYMENT_COMPLETED]: ServiceName.PAYMENT,
  [EventType.PAYMENT_FAILED]: ServiceName.PAYMENT,
  [EventType.PAYMENT_REFUNDED]: ServiceName.PAYMENT,
  [EventType.PRODUCT_UPDATED]: ServiceName.INVENTORY,
};

/**
 * The valid payload for `eventType` with `overrides` applied. Overrides may
 * break the contract on purpose, so they are not type-checked.
 */
export function aPayload<T extends EventType>(
  eventType: T,
  overrides: Record<string, unknown> = {},
): EventPayloads[T] {
  return { ...VALID_PAYLOADS[eventType], ...overrides };
}

/**
 * A message as another service would write it to Kafka, before JSON encoding.
 * `overrides` replace envelope fields; an `undefined` one is left out of the JSON.
 */
export function aMessage(
  eventType: EventType = EventType.ORDER_CREATED,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    eventId: EVENT_ID,
    eventType,
    eventVersion: 1,
    occurredAt: '2026-11-22T10:15:00.000Z',
    aggregateId: eventType === EventType.PRODUCT_UPDATED ? PRODUCT_ID : ORDER_ID,
    correlationId: 'c-91ab',
    causationId: null,
    producer: PRODUCERS[eventType],
    payload: VALID_PAYLOADS[eventType],
    ...overrides,
  };
}

/** `aMessage(...)` as the JSON text a consumer receives. */
export function aMessageJson(
  eventType: EventType = EventType.ORDER_CREATED,
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify(aMessage(eventType, overrides));
}
