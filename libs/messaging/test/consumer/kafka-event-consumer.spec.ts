import { EventType } from '@app/contracts';
import { KafkaEventConsumer, type KafkaConsumer } from '../../src/consumer/kafka-event-consumer.js';
import type { MessageProcessor } from '../../src/consumer/message-processor.js';
import type { EventDispatcher } from '../../src/dispatcher/event-dispatcher.js';

describe('KafkaEventConsumer', () => {
  let consumer: { [K in keyof KafkaConsumer]: ReturnType<typeof vi.fn<KafkaConsumer[K]>> };
  let process: ReturnType<typeof vi.fn<MessageProcessor['process']>>;
  const dispatcherHandling = (...types: EventType[]): EventDispatcher =>
    ({ handledTypes: () => types.values() }) as unknown as EventDispatcher;

  beforeEach(() => {
    consumer = {
      connect: vi.fn<KafkaConsumer['connect']>().mockResolvedValue(undefined),
      subscribe: vi.fn<KafkaConsumer['subscribe']>().mockResolvedValue(undefined),
      run: vi.fn<KafkaConsumer['run']>().mockResolvedValue(undefined),
      disconnect: vi.fn<KafkaConsumer['disconnect']>().mockResolvedValue(undefined),
    };
    process = vi.fn<MessageProcessor['process']>().mockResolvedValue(undefined);
  });

  const build = (...types: EventType[]): KafkaEventConsumer =>
    new KafkaEventConsumer(consumer, dispatcherHandling(...types), {
      process,
    } as unknown as MessageProcessor);

  it('subscribes once to each topic its handlers need, from the start of the topic', async () => {
    await build(
      EventType.STOCK_RESERVED,
      EventType.STOCK_RESERVATION_FAILED,
      EventType.PRODUCT_UPDATED,
    ).onApplicationBootstrap();

    expect(consumer.connect).toHaveBeenCalledOnce();
    expect(consumer.subscribe.mock.calls.map(([arg]) => arg)).toEqual([
      { topic: 'inventory.events', fromBeginning: true },
      { topic: 'products.events', fromBeginning: true },
    ]);
  });

  it('hands each message to the processor and waits, so the offset is committed after the work', async () => {
    await build(EventType.PRODUCT_UPDATED).onApplicationBootstrap();
    const eachMessage = consumer.run.mock.calls[0]?.[0]?.eachMessage;
    let finished = false;
    process.mockImplementation(async () => {
      await Promise.resolve();
      finished = true;
    });

    await eachMessage?.({
      topic: 'products.events',
      partition: 1,
      message: {
        key: Buffer.from('p1'),
        value: Buffer.from('{}'),
        offset: '5',
        timestamp: '0',
        attributes: 0,
        headers: {},
      },
      heartbeat: () => Promise.resolve(),
      pause: () => () => undefined,
    });

    expect(finished).toBe(true);
    expect(process).toHaveBeenCalledWith({
      topic: 'products.events',
      partition: 1,
      key: Buffer.from('p1'),
      value: Buffer.from('{}'),
    });
  });

  it('does not connect when it has no handlers', async () => {
    await build().onApplicationBootstrap();

    expect(consumer.connect).not.toHaveBeenCalled();
    expect(consumer.run).not.toHaveBeenCalled();
  });

  it('disconnects when the app stops', async () => {
    const instance = build(EventType.PRODUCT_UPDATED);
    await instance.onApplicationBootstrap();

    await instance.onModuleDestroy();

    expect(consumer.disconnect).toHaveBeenCalledOnce();
  });

  it('does not disconnect what it never connected', async () => {
    await build().onModuleDestroy();

    expect(consumer.disconnect).not.toHaveBeenCalled();
  });
});
