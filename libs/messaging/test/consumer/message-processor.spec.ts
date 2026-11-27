import { getCorrelationId } from '@app/common';
import { Logger } from '@nestjs/common';
import { EventType, ServiceName } from '@app/contracts';
import { DEAD_LETTER_ERROR_MAX_LENGTH } from '../../src/constants.js';
import type { EventDispatcher } from '../../src/dispatcher/event-dispatcher.js';
import type { EventPublisher } from '../../src/kafka/event-publisher.js';
import { MessageProcessor, type ReceivedMessage } from '../../src/consumer/message-processor.js';
import { anEvent } from '../builders/outbox.builder.js';

const messageOf = (
  value: string | null,
  overrides: Partial<ReceivedMessage> = {},
): ReceivedMessage => ({
  topic: 'orders.events',
  partition: 2,
  key: Buffer.from('order-1'),
  value: value === null ? null : Buffer.from(value),
  ...overrides,
});

describe('MessageProcessor', () => {
  let dispatch: ReturnType<typeof vi.fn<EventDispatcher['dispatch']>>;
  let publish: ReturnType<typeof vi.fn<EventPublisher['publish']>>;
  let processor: MessageProcessor;

  /** The headers of the one message sent to the dead-letter topic. */
  const sentHeaders = (): Record<string, string> => publish.mock.calls[0]?.[0][0]?.headers ?? {};

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    dispatch = vi.fn<EventDispatcher['dispatch']>().mockResolvedValue(true);
    publish = vi.fn<EventPublisher['publish']>().mockResolvedValue(undefined);
    processor = new MessageProcessor(
      ServiceName.INVENTORY,
      { dispatch } as unknown as EventDispatcher,
      {
        publish,
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives the parsed event to the dispatcher', async () => {
    const event = anEvent();

    await processor.process(messageOf(JSON.stringify(event)));

    expect(dispatch).toHaveBeenCalledExactlyOnceWith(event);
    expect(publish).not.toHaveBeenCalled();
  });

  it('runs the handler with the correlation ID of the event, so its logs and new events carry it', async () => {
    let seen: string | undefined;
    dispatch.mockImplementation(() => {
      seen = getCorrelationId();
      return Promise.resolve(true);
    });

    await processor.process(messageOf(JSON.stringify(anEvent(undefined, 'journey-7'))));

    expect(seen).toBe('journey-7');
    expect(getCorrelationId()).toBeUndefined();
  });

  it('logs each event it handles, with the journey it belongs to, inside the correlation context', async () => {
    const event = anEvent(undefined, 'journey-7');
    let correlationWhenLogged: string | undefined;
    vi.mocked(Logger.prototype.log).mockImplementation(() => {
      correlationWhenLogged = getCorrelationId();
    });

    await processor.process(messageOf(JSON.stringify(event)));

    expect(Logger.prototype.log).toHaveBeenCalledWith(`Handled OrderConfirmed ${event.eventId}`);
    expect(correlationWhenLogged).toBe('journey-7');
  });

  it('accepts an event that nobody here handles', async () => {
    dispatch.mockResolvedValue(false);

    await expect(processor.process(messageOf(JSON.stringify(anEvent())))).resolves.toBeUndefined();
    expect(Logger.prototype.log).not.toHaveBeenCalled();
    expect(Logger.prototype.debug).toHaveBeenCalledWith(
      expect.stringContaining('Ignored OrderConfirmed'),
    );
  });

  it('passes on a handler error, so the message is not committed and is read again', async () => {
    const failure = new Error('lock conflict');
    dispatch.mockRejectedValue(failure);

    await expect(processor.process(messageOf(JSON.stringify(anEvent())))).rejects.toBe(failure);

    expect(publish).not.toHaveBeenCalled();
  });

  describe('a message that can never be handled', () => {
    it.each([
      ['not JSON', 'oops'],
      ['an unknown event type', JSON.stringify({ ...anEvent(), eventType: 'OrderShipped' })],
      [
        'a payload that breaks its rules',
        JSON.stringify({ ...anEvent(), payload: { orderId: 1 } }),
      ],
    ])(
      'moves %s to the dead-letter topic of this service, and carries on',
      async (_case, value) => {
        await expect(processor.process(messageOf(value))).resolves.toBeUndefined();

        expect(dispatch).not.toHaveBeenCalled();
        expect(publish).toHaveBeenCalledOnce();
        expect(publish).toHaveBeenCalledWith([
          {
            topic: 'inventory-service.dlt',
            key: 'order-1',
            value,
            headers: {
              'x-original-topic': 'orders.events',
              'x-original-partition': '2',
              'x-error': expect.any(String) as string,
            },
          },
        ]);
      },
    );

    it('says what is wrong in the x-error header', async () => {
      await processor.process(
        messageOf(
          JSON.stringify({ ...anEvent(), eventType: EventType.ORDER_CONFIRMED, payload: {} }),
        ),
      );

      expect(sentHeaders()['x-error']).toBe(
        'The OrderConfirmed payload is invalid: payload.orderId',
      );
    });

    it('keeps the error header short', async () => {
      const manyBadItems = Array.from({ length: 100 }, () => ({ productId: 'x', quantity: 0 }));

      await processor.process(
        messageOf(
          JSON.stringify({
            ...anEvent(),
            eventType: 'OrderCreated',
            payload: { items: manyBadItems },
          }),
        ),
      );

      expect(sentHeaders()['x-error']).toHaveLength(DEAD_LETTER_ERROR_MAX_LENGTH);
    });

    it('sends a message without a value, keeping an empty string for it', async () => {
      await processor.process(messageOf(null, { key: null }));

      expect(publish).toHaveBeenCalledWith([expect.objectContaining({ key: '', value: '' })]);
    });

    it('passes on the error when even the dead-letter topic is unreachable, so nothing is lost', async () => {
      const failure = new Error('broker down');
      publish.mockRejectedValue(failure);

      await expect(processor.process(messageOf('oops'))).rejects.toBe(failure);
    });
  });
});
