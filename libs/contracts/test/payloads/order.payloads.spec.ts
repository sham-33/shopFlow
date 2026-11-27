import { createEvent } from '../../src/create-event.js';
import { CancelReason, EventType, PaymentMethod } from '../../src/enums.js';
import {
  aPayload,
  FROM_REQUEST,
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
} from '../builders/events.builder.js';
import { problemFields } from '../helpers/problem-fields.js';

const { ORDER_CREATED, ORDER_PAYMENT_REQUESTED, ORDER_CONFIRMED, ORDER_CANCELLED } = EventType;
const item = { productId: PRODUCT_ID, quantity: 2, unitPrice: 499.5 };

/** The broken fields of `eventType`'s valid payload with `overrides`. */
const problemsWith = (eventType: EventType, overrides: Record<string, unknown>): string[] =>
  problemFields(() => createEvent(eventType, aPayload(eventType, overrides), FROM_REQUEST));

describe('order event payloads', () => {
  const accepted: [EventType, string, Record<string, unknown>][] = [
    [ORDER_CREATED, 'an order of 0 rupees (a 100% discount)', { totalAmount: 0 }],
    [ORDER_CREATED, 'one item', { items: [item] }],
    ...Object.values(PaymentMethod).map((method): [EventType, string, Record<string, unknown>] => [
      ORDER_PAYMENT_REQUESTED,
      `payment by ${method}`,
      { paymentMethod: method },
    ]),
    ...Object.values(CancelReason).map((reason): [EventType, string, Record<string, unknown>] => [
      ORDER_CANCELLED,
      `cancellation for ${reason}`,
      { reason },
    ]),
  ];

  it.each(accepted)('%s accepts %s', (eventType, _case, overrides) => {
    expect(() =>
      createEvent(eventType, aPayload(eventType, overrides), FROM_REQUEST),
    ).not.toThrow();
  });

  it.each([
    [ORDER_CREATED, 'a missing orderId', { orderId: undefined }, ['payload.orderId']],
    [ORDER_CREATED, 'an orderId that is not a UUID', { orderId: 'ord_7d1e' }, ['payload.orderId']],
    [
      ORDER_CREATED,
      'a customerId that is not a UUID',
      { customerId: 'cus_42' },
      ['payload.customerId'],
    ],
    [ORDER_CREATED, 'no items', { items: [] }, ['payload.items']],
    [ORDER_CREATED, 'items that are not a list', { items: 'TSHIRT' }, ['payload.items']],
    [ORDER_CREATED, 'an item that is not an object', { items: [null] }, ['payload.items.0']],
    [
      ORDER_CREATED,
      'the same product twice',
      { items: [item, { ...item, quantity: 1 }] },
      ['payload.items'],
    ],
    [
      ORDER_CREATED,
      'a quantity of 0',
      { items: [{ ...item, quantity: 0 }] },
      ['payload.items.0.quantity'],
    ],
    [
      ORDER_CREATED,
      'a fractional quantity',
      { items: [{ ...item, quantity: 1.5 }] },
      ['payload.items.0.quantity'],
    ],
    [
      ORDER_CREATED,
      'a unit price with 3 decimals',
      { items: [{ ...item, unitPrice: 499.999 }] },
      ['payload.items.0.unitPrice'],
    ],
    [
      ORDER_CREATED,
      'a unit price as a string',
      { items: [{ ...item, unitPrice: '499.50' }] },
      ['payload.items.0.unitPrice'],
    ],
    [
      ORDER_CREATED,
      'a broken second item',
      { items: [item, { productId: OTHER_PRODUCT_ID, quantity: 1 }] },
      ['payload.items.1.unitPrice'],
    ],
    [ORDER_CREATED, 'a negative total', { totalAmount: -1 }, ['payload.totalAmount']],
    [
      ORDER_CREATED,
      'a currency that is not ISO 4217',
      { currency: 'RUPEES' },
      ['payload.currency'],
    ],
    [
      ORDER_CREATED,
      'an unknown payment method',
      { paymentMethod: 'CASH' },
      ['payload.paymentMethod'],
    ],
    [ORDER_PAYMENT_REQUESTED, 'a missing amount', { amount: undefined }, ['payload.amount']],
    [ORDER_PAYMENT_REQUESTED, 'a lower-case currency', { currency: 'inr' }, ['payload.currency']],
    [
      ORDER_PAYMENT_REQUESTED,
      'a missing customerId',
      { customerId: undefined },
      ['payload.customerId'],
    ],
    [ORDER_CONFIRMED, 'a missing orderId', { orderId: undefined }, ['payload.orderId']],
    [ORDER_CANCELLED, 'an unknown reason', { reason: 'CHANGED_MIND' }, ['payload.reason']],
    [ORDER_CANCELLED, 'a missing reason', { reason: undefined }, ['payload.reason']],
  ])('%s rejects %s', (eventType, _case, overrides, fields) => {
    expect(problemsWith(eventType, overrides)).toEqual(fields);
  });
});
