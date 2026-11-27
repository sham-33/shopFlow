import { createEvent } from '../../src/create-event.js';
import { EventType } from '../../src/enums.js';
import { aPayload, FROM_REQUEST, PRODUCT_ID } from '../builders/events.builder.js';
import { problemFields } from '../helpers/problem-fields.js';

const { STOCK_RESERVED, STOCK_RESERVATION_FAILED, STOCK_RELEASED } = EventType;

const problemsWith = (eventType: EventType, overrides: Record<string, unknown>): string[] =>
  problemFields(() => createEvent(eventType, aPayload(eventType, overrides), FROM_REQUEST));

describe('inventory event payloads', () => {
  it('accepts an item with no stock left at all', () => {
    const payload = aPayload(STOCK_RESERVATION_FAILED, {
      unavailableItems: [{ productId: PRODUCT_ID, requested: 1, available: 0 }],
    });

    expect(() => createEvent(STOCK_RESERVATION_FAILED, payload, FROM_REQUEST)).not.toThrow();
  });

  it.each([
    [STOCK_RESERVED, 'no reservations', { reservationIds: [] }, ['payload.reservationIds']],
    [
      STOCK_RESERVED,
      'a reservation ID that is not a UUID',
      { reservationIds: ['res-1'] },
      ['payload.reservationIds'],
    ],
    [
      STOCK_RESERVED,
      'reservation IDs that are not a list',
      { reservationIds: 'res-1' },
      ['payload.reservationIds'],
    ],
    [
      STOCK_RESERVATION_FAILED,
      'no unavailable items',
      { unavailableItems: [] },
      ['payload.unavailableItems'],
    ],
    [
      STOCK_RESERVATION_FAILED,
      'an item that asked for nothing',
      {
        unavailableItems: [{ productId: PRODUCT_ID, requested: 0, available: 0 }],
      },
      ['payload.unavailableItems.0.requested'],
    ],
    [
      STOCK_RESERVATION_FAILED,
      'negative stock',
      {
        unavailableItems: [{ productId: PRODUCT_ID, requested: 2, available: -1 }],
      },
      ['payload.unavailableItems.0.available'],
    ],
    [
      STOCK_RESERVATION_FAILED,
      'an item without a product',
      { unavailableItems: [{ requested: 2, available: 1 }] },
      ['payload.unavailableItems.0.productId'],
    ],
    [STOCK_RELEASED, 'no items', { items: [] }, ['payload.items']],
    [
      STOCK_RELEASED,
      'a quantity of 0',
      { items: [{ productId: PRODUCT_ID, quantity: 0 }] },
      ['payload.items.0.quantity'],
    ],
    [STOCK_RELEASED, 'a missing orderId', { orderId: undefined }, ['payload.orderId']],
  ])('%s rejects %s', (eventType, _case, overrides, fields) => {
    expect(problemsWith(eventType, overrides)).toEqual(fields);
  });
});
