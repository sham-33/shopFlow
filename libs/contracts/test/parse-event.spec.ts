import { EventType } from '../src/enums.js';
import { InvalidEventError } from '../src/invalid-event.error.js';
import { parseEvent } from '../src/parse-event.js';
import { OrderCreatedPayload, OrderedItem } from '../src/payloads/order.payloads.js';
import {
  aMessage,
  aMessageJson,
  CUSTOMER_ID,
  EVENT_ID,
  ORDER_ID,
  PRODUCT_ID,
} from './builders/events.builder.js';
import { problemFields } from './helpers/problem-fields.js';

describe('parseEvent', () => {
  it('reads the example envelope of docs/plan.md, section 4.5', () => {
    const json = `{
      "eventId": "${EVENT_ID}",
      "eventType": "OrderCreated",
      "eventVersion": 1,
      "occurredAt": "2026-11-22T10:15:00.000Z",
      "aggregateId": "${ORDER_ID}",
      "correlationId": "c-91ab",
      "causationId": null,
      "producer": "order-service",
      "payload": {
        "orderId": "${ORDER_ID}",
        "customerId": "${CUSTOMER_ID}",
        "items": [{ "productId": "${PRODUCT_ID}", "quantity": 2, "unitPrice": 499.0 }],
        "totalAmount": 898.2,
        "currency": "INR",
        "paymentMethod": "WALLET"
      }
    }`;

    expect(parseEvent(json)).toEqual({
      eventId: EVENT_ID,
      eventType: EventType.ORDER_CREATED,
      eventVersion: 1,
      occurredAt: '2026-11-22T10:15:00.000Z',
      aggregateId: ORDER_ID,
      correlationId: 'c-91ab',
      causationId: null,
      producer: 'order-service',
      payload: {
        orderId: ORDER_ID,
        customerId: CUSTOMER_ID,
        items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 499 }],
        totalAmount: 898.2,
        currency: 'INR',
        paymentMethod: 'WALLET',
      },
    });
  });

  it('reads a Kafka Buffer the same as a string', () => {
    const json = aMessageJson();

    expect(parseEvent(Buffer.from(json))).toEqual(parseEvent(json));
  });

  it('returns the payload as an instance of its class, so the event type narrows it', () => {
    const event = parseEvent(aMessageJson(EventType.ORDER_CREATED));

    expect(event.payload).toBeInstanceOf(OrderCreatedPayload);
    if (event.eventType !== EventType.ORDER_CREATED) {
      throw new Error(`Expected OrderCreated, got ${event.eventType}`);
    }
    expect(event.payload.items[0]).toBeInstanceOf(OrderedItem);
  });

  it('keeps the event that caused this one', () => {
    const cause = 'e1000000-0000-4000-8000-000000000001';

    expect(
      parseEvent(aMessageJson(EventType.STOCK_RESERVED, { causationId: cause })),
    ).toMatchObject({ causationId: cause });
  });

  // The "tolerant reader" rule: a producer may add fields within a version.
  it('accepts fields it does not know, and leaves them out of the event', () => {
    const message = aMessage(EventType.ORDER_CREATED, { traceId: 'abc' });
    const json = JSON.stringify({
      ...message,
      payload: {
        ...(message.payload as object),
        giftWrap: true,
        items: [{ productId: PRODUCT_ID, quantity: 1, unitPrice: 10, colour: 'red' }],
      },
    });

    const event = parseEvent(json);

    expect(event).not.toHaveProperty('traceId');
    expect(event.payload).not.toHaveProperty('giftWrap');
    expect(event.payload).toMatchObject({
      items: [{ productId: PRODUCT_ID, quantity: 1, unitPrice: 10 }],
    });
    expect(event.payload).not.toHaveProperty('items.0.colour');
  });

  it('does not let a message change the prototype of objects', () => {
    const json = aMessageJson(EventType.ORDER_CONFIRMED).replace(
      `"payload":{`,
      `"payload":{"__proto__":{"polluted":true},`,
    );

    const event = parseEvent(json);

    expect(event.payload).not.toHaveProperty('polluted');
    expect({}).not.toHaveProperty('polluted');
  });

  describe('refuses a message that is not an event object', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty string', ''],
      ['an empty Buffer', Buffer.alloc(0)],
    ])('%s: no value', (_case, value) => {
      expect(() => parseEvent(value)).toThrow(new InvalidEventError('The message has no value'));
    });

    it.each(['{', 'not json', "{'single': 'quotes'}"])('%s: not JSON', (value) => {
      expect(() => parseEvent(value)).toThrow(
        new InvalidEventError('The message is not valid JSON'),
      );
    });

    it.each(['[]', '42', '"text"', 'null', 'true'])('%s: not an object', (value) => {
      expect(() => parseEvent(value)).toThrow(
        new InvalidEventError('The message is not a JSON object'),
      );
    });
  });

  describe('refuses an envelope that breaks the contract', () => {
    it.each([
      ['eventId', 'evt-1'],
      ['eventId', undefined],
      ['eventType', 'OrderShipped'],
      ['eventType', undefined],
      ['eventVersion', 0],
      ['eventVersion', 1.5],
      ['eventVersion', '1'],
      ['occurredAt', 'yesterday'],
      ['occurredAt', 1764000000000],
      ['aggregateId', 'ord_7d1e'],
      ['correlationId', 'c 91ab'],
      ['correlationId', 'c'.repeat(129)],
      ['correlationId', 42],
      ['causationId', 'evt-1'],
      ['causationId', undefined],
      ['producer', 'shipping-service'],
      ['payload', 'text'],
      ['payload', []],
      ['payload', null],
    ])('%s = %j', (field, value) => {
      expect(problemFields(() => parseEvent(aMessageJson(undefined, { [field]: value })))).toEqual([
        field,
      ]);
    });

    it('names every broken field at once', () => {
      const json = aMessageJson(undefined, {
        eventId: 'x',
        producer: 'x',
        occurredAt: 'x',
      });

      expect(problemFields(() => parseEvent(json))).toEqual(['eventId', 'occurredAt', 'producer']);
    });
  });

  it('refuses a version it cannot read', () => {
    expect(() => parseEvent(aMessageJson(EventType.ORDER_CREATED, { eventVersion: 2 }))).toThrow(
      new InvalidEventError(
        'OrderCreated version 2 is not supported; this service reads version 1',
      ),
    );
  });

  it('refuses an event from a service that does not write it', () => {
    const json = aMessageJson(EventType.ORDER_CREATED, {
      producer: 'inventory-service',
    });

    expect(() => parseEvent(json)).toThrow(
      new InvalidEventError(
        'OrderCreated is written by order-service, but this one came from inventory-service',
      ),
    );
  });

  it('refuses an aggregateId that does not match the payload, since it is the message key', () => {
    const json = aMessageJson(EventType.ORDER_CONFIRMED, {
      aggregateId: PRODUCT_ID,
    });

    expect(() => parseEvent(json)).toThrow(
      new InvalidEventError(
        `aggregateId ${PRODUCT_ID} does not match the payload, which is about ${ORDER_ID}`,
      ),
    );
  });

  it('refuses a payload that breaks its event type’s rules, with paths into the payload', () => {
    const json = aMessageJson(EventType.ORDER_CREATED, {
      payload: {
        orderId: ORDER_ID,
        items: [{ productId: PRODUCT_ID, quantity: -1 }],
      },
    });

    expect(problemFields(() => parseEvent(json))).toEqual([
      'payload.currency',
      'payload.customerId',
      'payload.items.0.quantity',
      'payload.items.0.unitPrice',
      'payload.paymentMethod',
      'payload.totalAmount',
    ]);
  });
});
