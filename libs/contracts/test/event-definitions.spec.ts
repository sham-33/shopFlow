import { EventType } from '../src/enums.js';
import { EVENT_DEFINITIONS } from '../src/event-definitions.js';
import { ORDER_ID, PRODUCT_ID, VALID_PAYLOADS } from './builders/events.builder.js';

// Copied from docs/plan.md, section 4.6, on purpose, as the values that go over
// the wire: the test does not read them from the code, so a wrong change to
// the code fails here.
const CATALOG: [string, string, string][] = [
  ['OrderCreated', 'orders.events', 'order-service'],
  ['OrderPaymentRequested', 'orders.events', 'order-service'],
  ['OrderConfirmed', 'orders.events', 'order-service'],
  ['OrderCancelled', 'orders.events', 'order-service'],
  ['StockReserved', 'inventory.events', 'inventory-service'],
  ['StockReservationFailed', 'inventory.events', 'inventory-service'],
  ['StockReleased', 'inventory.events', 'inventory-service'],
  ['PaymentCompleted', 'payments.events', 'payment-service'],
  ['PaymentFailed', 'payments.events', 'payment-service'],
  ['PaymentRefunded', 'payments.events', 'payment-service'],
  ['ProductUpdated', 'products.events', 'inventory-service'],
];

describe('EVENT_DEFINITIONS', () => {
  it('has exactly the events of the catalog', () => {
    expect(Object.values(EventType).sort()).toEqual(CATALOG.map(([type]) => type).sort());
    expect(Object.keys(EVENT_DEFINITIONS).sort()).toEqual(Object.values(EventType).sort());
  });

  it.each(CATALOG)('writes %s to %s, from %s, as version 1', (eventType, topic, producer) => {
    expect(EVENT_DEFINITIONS[eventType as EventType]).toMatchObject({
      topic,
      producer,
      version: 1,
    });
  });

  it.each(CATALOG.filter(([type]) => type !== 'ProductUpdated').map(([type]) => type))(
    'keys %s by its order, so one order keeps to one partition',
    (eventType) => {
      const type = eventType as EventType;
      const definition = EVENT_DEFINITIONS[type] as {
        aggregateIdOf: (payload: object) => string;
      };

      expect(definition.aggregateIdOf(VALID_PAYLOADS[type])).toBe(ORDER_ID);
    },
  );

  it('keys ProductUpdated by its product, so compaction keeps the latest per product', () => {
    const definition = EVENT_DEFINITIONS[EventType.PRODUCT_UPDATED];

    expect(definition.aggregateIdOf(VALID_PAYLOADS[EventType.PRODUCT_UPDATED])).toBe(PRODUCT_ID);
  });
});
