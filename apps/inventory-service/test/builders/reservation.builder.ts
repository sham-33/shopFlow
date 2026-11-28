import {
  createEvent,
  type EventEnvelope,
  EventType,
  type OrderedItem,
  PaymentMethod,
} from '@app/contracts';
import { ReservationStatus } from '../../src/domain/enums.js';
import { StockReservation } from '../../src/entities/stock-reservation.entity.js';
import { PRODUCT_ID } from './product.builder.js';

export const ORDER_ID = '0b5a1f9e-3c2d-4e8f-9a7b-6c5d4e3f2a1b';
export const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
/** Sorts after PRODUCT_ID. */
export const MUG_ID = '44444444-4444-4444-8444-444444444444';
/** Sorts before PRODUCT_ID. */
export const CAP_ID = '22222222-2222-4222-8222-222222222222';

/** One order line: 2 × the red T-shirt by default. */
export function anOrderedItem(overrides: Partial<OrderedItem> = {}): OrderedItem {
  return { productId: PRODUCT_ID, quantity: 2, unitPrice: 499.5, ...overrides };
}

/** An OrderCreated event, as the order service writes it, for the given lines. */
export function anOrderCreated(
  items: OrderedItem[] = [anOrderedItem()],
): EventEnvelope<EventType.ORDER_CREATED> {
  return createEvent(
    EventType.ORDER_CREATED,
    {
      orderId: ORDER_ID,
      customerId: CUSTOMER_ID,
      items,
      totalAmount: 999,
      currency: 'INR',
      paymentMethod: PaymentMethod.WALLET,
    },
    { correlationId: 'c-91ab', causationId: null },
  );
}

let nextReservation = 0;

/** A RESERVED row as the repository returns it, with a fresh UUID. */
export function aReservation(overrides: Partial<StockReservation> = {}): StockReservation {
  nextReservation += 1;
  return Object.assign(new StockReservation(), {
    id: `aaaaaaaa-0000-4000-8000-${String(nextReservation).padStart(12, '0')}`,
    orderId: ORDER_ID,
    productId: PRODUCT_ID,
    quantity: 2,
    status: ReservationStatus.RESERVED,
    createdAt: new Date('2026-11-27T10:00:00.000Z'),
    updatedAt: new Date('2026-11-27T10:00:00.000Z'),
    ...overrides,
  });
}
