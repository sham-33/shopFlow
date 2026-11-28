import { createEvent, type EventEnvelope, EventType } from '@app/contracts';
import { ORDER_ID, SHIRT_ID } from './order.builder.js';

/** The context of the OrderCreated that inventory answers. */
const ANSWERING_ORDER_CREATED = {
  correlationId: 'c-91ab',
  causationId: '9e0f1a2b-3c4d-4e5f-8a6b-7c8d9e0f1a2b',
};

/** Inventory held every item of ORDER_ID. */
export function aStockReserved(orderId = ORDER_ID): EventEnvelope<EventType.STOCK_RESERVED> {
  return createEvent(
    EventType.STOCK_RESERVED,
    { orderId, reservationIds: ['d4000000-0000-4000-8000-000000000001'] },
    ANSWERING_ORDER_CREATED,
  );
}

/** Inventory reserved nothing for ORDER_ID: the T-shirt is short. */
export function aStockReservationFailed(
  orderId = ORDER_ID,
): EventEnvelope<EventType.STOCK_RESERVATION_FAILED> {
  return createEvent(
    EventType.STOCK_RESERVATION_FAILED,
    {
      orderId,
      unavailableItems: [{ productId: SHIRT_ID, requested: 2, available: 1 }],
    },
    ANSWERING_ORDER_CREATED,
  );
}
