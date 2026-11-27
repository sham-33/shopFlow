import { IdempotentConsumer } from '../../src/inbox/idempotent-consumer.js';
import type { ProcessedEventRepository } from '../../src/inbox/processed-event.repository.js';
import { aManager } from '../builders/outbox.builder.js';

const EVENT_ID = '5f0c8a2e-1b7d-4c3a-9e21-0d4f6a7b8c90';

describe('IdempotentConsumer', () => {
  const manager = aManager();
  let markProcessed: ReturnType<typeof vi.fn<ProcessedEventRepository['markProcessed']>>;
  let consumer: IdempotentConsumer;

  beforeEach(() => {
    markProcessed = vi.fn<ProcessedEventRepository['markProcessed']>().mockResolvedValue(true);
    consumer = new IdempotentConsumer({ markProcessed });
  });

  it('does the work the first time an event arrives, and says so', async () => {
    const work = vi.fn().mockResolvedValue(undefined);

    expect(await consumer.run(manager, 'order-service', EVENT_ID, work)).toBe(true);

    expect(work).toHaveBeenCalledOnce();
  });

  it('records the event for this consumer in the same transaction', async () => {
    await consumer.run(manager, 'order-service', EVENT_ID, () => Promise.resolve());

    expect(markProcessed).toHaveBeenCalledWith(EVENT_ID, 'order-service', manager);
  });

  it('records the event before doing the work, so a concurrent copy waits on the same row', async () => {
    const calls: string[] = [];
    markProcessed.mockImplementation(() => {
      calls.push('mark');
      return Promise.resolve(true);
    });

    await consumer.run(manager, 'order-service', EVENT_ID, () => {
      calls.push('work');
      return Promise.resolve();
    });

    expect(calls).toEqual(['mark', 'work']);
  });

  it('skips the work when the event was already handled, and says so', async () => {
    markProcessed.mockResolvedValue(false);
    const work = vi.fn().mockResolvedValue(undefined);

    expect(await consumer.run(manager, 'order-service', EVENT_ID, work)).toBe(false);

    expect(work).not.toHaveBeenCalled();
  });

  it('passes on an error from the work, so the transaction rolls back and the record goes with it', async () => {
    const failure = new Error('stock table locked');

    await expect(
      consumer.run(manager, 'order-service', EVENT_ID, () => Promise.reject(failure)),
    ).rejects.toBe(failure);
  });

  it('passes on an error from recording the event, without doing the work', async () => {
    const failure = new Error('connection lost');
    markProcessed.mockRejectedValue(failure);
    const work = vi.fn();

    await expect(consumer.run(manager, 'order-service', EVENT_ID, work)).rejects.toBe(failure);

    expect(work).not.toHaveBeenCalled();
  });
});
