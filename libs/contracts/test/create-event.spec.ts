import { causedBy, createEvent } from '../src/create-event.js';
import { EventType } from '../src/enums.js';
import { parseEvent } from '../src/parse-event.js';
import {
  aPayload,
  FROM_REQUEST,
  ORDER_ID,
  PRODUCT_ID,
  VALID_PAYLOADS,
} from './builders/events.builder.js';
import { problemFields } from './helpers/problem-fields.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createEvent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('wraps the payload in an envelope, taking the version, key and producer from the catalog', () => {
    vi.useFakeTimers({ now: new Date('2026-11-26T10:00:00.000Z') });
    const payload = VALID_PAYLOADS[EventType.ORDER_CREATED];

    const event = createEvent(EventType.ORDER_CREATED, payload, FROM_REQUEST);

    expect(event).toEqual({
      eventId: expect.stringMatching(UUID) as string,
      eventType: 'OrderCreated',
      eventVersion: 1,
      occurredAt: '2026-11-26T10:00:00.000Z',
      aggregateId: ORDER_ID,
      correlationId: 'c-91ab',
      causationId: null,
      producer: 'order-service',
      payload,
    });
  });

  it('gives every event its own eventId', () => {
    const payload = VALID_PAYLOADS[EventType.ORDER_CONFIRMED];

    const first = createEvent(EventType.ORDER_CONFIRMED, payload, FROM_REQUEST);
    const second = createEvent(EventType.ORDER_CONFIRMED, payload, FROM_REQUEST);

    expect(first.eventId).not.toBe(second.eventId);
  });

  it('keys ProductUpdated by the product', () => {
    const event = createEvent(
      EventType.PRODUCT_UPDATED,
      VALID_PAYLOADS[EventType.PRODUCT_UPDATED],
      FROM_REQUEST,
    );

    expect(event.aggregateId).toBe(PRODUCT_ID);
    expect(event.producer).toBe('inventory-service');
  });

  it.each(Object.values(EventType))('writes a %s that parseEvent reads back unchanged', (type) => {
    const event = createEvent(type, VALID_PAYLOADS[type], FROM_REQUEST);

    expect(parseEvent(JSON.stringify(event))).toEqual(event);
  });

  it('leaves out fields the contract does not have, at every level', () => {
    const payload = aPayload(EventType.ORDER_CREATED, {
      internalNote: 'do not publish',
      items: [
        {
          productId: PRODUCT_ID,
          quantity: 1,
          unitPrice: 10,
          warehouse: 'BLR-1',
        },
      ],
    });

    const event = createEvent(EventType.ORDER_CREATED, payload, FROM_REQUEST);

    expect(event.payload).not.toHaveProperty('internalNote');
    expect(event.payload.items[0]).toEqual({
      productId: PRODUCT_ID,
      quantity: 1,
      unitPrice: 10,
    });
  });

  it('refuses a payload that breaks the contract, naming every broken field', () => {
    const payload = aPayload(EventType.ORDER_CREATED, {
      totalAmount: 1.005,
      items: [{ productId: 'prd_1', quantity: 0, unitPrice: 10 }],
    });

    expect(
      problemFields(() => createEvent(EventType.ORDER_CREATED, payload, FROM_REQUEST)),
    ).toEqual(['payload.items.0.productId', 'payload.items.0.quantity', 'payload.totalAmount']);
  });

  it.each([
    [
      'a correlation ID with spaces',
      { correlationId: 'c 91ab', causationId: null },
      'correlationId',
    ],
    ['an empty correlation ID', { correlationId: '', causationId: null }, 'correlationId'],
    [
      'a causation ID that is not an event ID',
      { correlationId: 'c-91ab', causationId: 'evt-1' },
      'causationId',
    ],
  ])('refuses %s, which consumers would reject', (_case, context, field) => {
    const payload = VALID_PAYLOADS[EventType.ORDER_CONFIRMED];

    expect(problemFields(() => createEvent(EventType.ORDER_CONFIRMED, payload, context))).toEqual([
      field,
    ]);
  });
});

describe('causedBy', () => {
  it('keeps the journey and links the new event to the one that caused it', () => {
    const orderCreated = createEvent(
      EventType.ORDER_CREATED,
      VALID_PAYLOADS[EventType.ORDER_CREATED],
      { correlationId: 'journey-1', causationId: null },
    );

    const stockReserved = createEvent(
      EventType.STOCK_RESERVED,
      VALID_PAYLOADS[EventType.STOCK_RESERVED],
      causedBy(orderCreated),
    );

    expect(stockReserved.correlationId).toBe('journey-1');
    expect(stockReserved.causationId).toBe(orderCreated.eventId);
  });
});
