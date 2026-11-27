import { KafkaEventPublisher, type KafkaProducer } from '../../src/kafka/kafka-event-publisher.js';
import type { OutgoingMessage } from '../../src/kafka/event-publisher.js';

const message = (topic: string, key: string): OutgoingMessage => ({
  topic,
  key,
  value: `{"k":"${key}"}`,
  headers: { 'x-event-type': 'OrderConfirmed' },
});

describe('KafkaEventPublisher', () => {
  let producer: { [K in keyof KafkaProducer]: ReturnType<typeof vi.fn<KafkaProducer[K]>> };
  let publisher: KafkaEventPublisher;

  beforeEach(() => {
    producer = {
      connect: vi.fn<KafkaProducer['connect']>().mockResolvedValue(undefined),
      disconnect: vi.fn<KafkaProducer['disconnect']>().mockResolvedValue(undefined),
      sendBatch: vi.fn<KafkaProducer['sendBatch']>().mockResolvedValue([]),
    };
    publisher = new KafkaEventPublisher(producer);
  });

  it('connects when the app starts and disconnects when it stops', async () => {
    await publisher.onModuleInit();
    await publisher.onModuleDestroy();

    expect(producer.connect).toHaveBeenCalledOnce();
    expect(producer.disconnect).toHaveBeenCalledOnce();
  });

  it('sends nothing for an empty list', async () => {
    await publisher.publish([]);

    expect(producer.sendBatch).not.toHaveBeenCalled();
  });

  it('waits for every replica to have the messages (acks: all)', async () => {
    await publisher.publish([message('orders.events', 'o1')]);

    expect(producer.sendBatch).toHaveBeenCalledWith(expect.objectContaining({ acks: -1 }));
  });

  it('sends everything in one batch, grouped by topic, keeping the order within each key', async () => {
    await publisher.publish([
      message('orders.events', 'o1'),
      message('products.events', 'p1'),
      message('orders.events', 'o2'),
    ]);

    expect(producer.sendBatch).toHaveBeenCalledOnce();
    expect(producer.sendBatch).toHaveBeenCalledWith({
      acks: -1,
      topicMessages: [
        {
          topic: 'orders.events',
          messages: [
            { key: 'o1', value: '{"k":"o1"}', headers: { 'x-event-type': 'OrderConfirmed' } },
            { key: 'o2', value: '{"k":"o2"}', headers: { 'x-event-type': 'OrderConfirmed' } },
          ],
        },
        {
          topic: 'products.events',
          messages: [
            { key: 'p1', value: '{"k":"p1"}', headers: { 'x-event-type': 'OrderConfirmed' } },
          ],
        },
      ],
    });
  });

  it('passes on a send error, so the relay keeps the events', async () => {
    const failure = new Error('The broker is not available');
    producer.sendBatch.mockRejectedValue(failure);

    await expect(publisher.publish([message('orders.events', 'o1')])).rejects.toBe(failure);
  });
});
