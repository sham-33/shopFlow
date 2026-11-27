import { EventType, type AnyEvent } from '@app/contracts';
import type { EventHandler } from '../../src/dispatcher/event-handler.js';
import { EventDispatcher } from '../../src/dispatcher/event-dispatcher.js';
import { anEvent } from '../builders/outbox.builder.js';

function aHandler<T extends EventType>(
  eventType: T,
): EventHandler<T> & {
  handle: ReturnType<typeof vi.fn>;
} {
  return { eventType, handle: vi.fn().mockResolvedValue(undefined) };
}

describe('EventDispatcher', () => {
  it('gives the event to the handler of its type, and says it was handled', async () => {
    const confirmed = aHandler(EventType.ORDER_CONFIRMED);
    const dispatcher = new EventDispatcher([confirmed]);
    const event = anEvent();

    expect(await dispatcher.dispatch(event)).toBe(true);

    expect(confirmed.handle).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('picks the handler by event type, not by order', async () => {
    const cancelled = aHandler(EventType.ORDER_CANCELLED);
    const confirmed = aHandler(EventType.ORDER_CONFIRMED);
    const dispatcher = new EventDispatcher([cancelled, confirmed]);

    await dispatcher.dispatch(anEvent());

    expect(confirmed.handle).toHaveBeenCalledOnce();
    expect(cancelled.handle).not.toHaveBeenCalled();
  });

  // A topic carries events this service does not care about, such as
  // OrderPaymentRequested on orders.events for the inventory service.
  it('ignores a valid event nobody here handles, and says so', async () => {
    const cancelled = aHandler(EventType.ORDER_CANCELLED);
    const dispatcher = new EventDispatcher([cancelled]);

    expect(await dispatcher.dispatch(anEvent())).toBe(false);

    expect(cancelled.handle).not.toHaveBeenCalled();
  });

  it('ignores every event when it has no handlers', async () => {
    expect(await new EventDispatcher([]).dispatch(anEvent())).toBe(false);
  });

  it('passes on an error from the handler, so the consumer can retry', async () => {
    const confirmed = aHandler(EventType.ORDER_CONFIRMED);
    const failure = new Error('lock conflict');
    confirmed.handle.mockRejectedValue(failure);

    await expect(new EventDispatcher([confirmed]).dispatch(anEvent())).rejects.toBe(failure);
  });

  it('refuses two handlers for one event type when it starts, naming the type', () => {
    const handlers = [aHandler(EventType.ORDER_CONFIRMED), aHandler(EventType.ORDER_CONFIRMED)];

    expect(() => new EventDispatcher(handlers)).toThrow('More than one handler for OrderConfirmed');
  });

  it('lists the event types it handles', () => {
    const dispatcher = new EventDispatcher([
      aHandler(EventType.ORDER_CONFIRMED),
      aHandler(EventType.ORDER_CANCELLED),
    ]);

    expect([...dispatcher.handledTypes()].sort()).toEqual(['OrderCancelled', 'OrderConfirmed']);
  });

  it('hands the handler the event narrowed to its own type', async () => {
    const received: AnyEvent[] = [];
    const dispatcher = new EventDispatcher([
      {
        eventType: EventType.ORDER_CONFIRMED,
        handle: (event) => {
          // Type check only: payload is OrderConfirmedPayload here.
          received.push(event);
          expect(event.payload.orderId).toBeDefined();
          return Promise.resolve();
        },
      } satisfies EventHandler<EventType.ORDER_CONFIRMED>,
    ]);

    await dispatcher.dispatch(anEvent());

    expect(received).toHaveLength(1);
  });
});
