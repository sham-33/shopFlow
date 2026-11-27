import type { DataSource, EntityManager } from 'typeorm';
import { OUTBOX_BATCH_SIZE, OUTBOX_RETENTION_MS } from '../../src/constants.js';
import type { EventPublisher } from '../../src/kafka/event-publisher.js';
import type { OutboxRepository } from '../../src/outbox/outbox.repository.js';
import { OutboxRelay } from '../../src/outbox/outbox-relay.js';
import { aManager, anEvent, anOutboxRow } from '../builders/outbox.builder.js';

describe('OutboxRelay', () => {
  const manager = aManager();
  let outbox: { [K in keyof OutboxRepository]: ReturnType<typeof vi.fn<OutboxRepository[K]>> };
  let publish: ReturnType<typeof vi.fn<EventPublisher['publish']>>;
  let transaction: ReturnType<typeof vi.fn>;
  let relay: OutboxRelay;

  beforeEach(() => {
    outbox = {
      add: vi.fn(),
      claimUnpublished: vi.fn<OutboxRepository['claimUnpublished']>().mockResolvedValue([]),
      markPublished: vi.fn(),
      recordFailedAttempt: vi.fn(),
      deletePublishedBefore: vi
        .fn<OutboxRepository['deletePublishedBefore']>()
        .mockResolvedValue(0),
    };
    publish = vi.fn<EventPublisher['publish']>().mockResolvedValue(undefined);
    // Like DataSource.transaction: runs the callback with a manager, and passes on what it returns or throws.
    transaction = vi.fn((work: (m: EntityManager) => Promise<unknown>) => work(manager));
    relay = new OutboxRelay(outbox, { publish }, { transaction } as unknown as DataSource);
  });

  describe('relayBatch', () => {
    it('does nothing when no event is waiting', async () => {
      expect(await relay.relayBatch()).toBe(0);

      expect(publish).not.toHaveBeenCalled();
      expect(outbox.markPublished).not.toHaveBeenCalled();
    });

    it('claims up to one batch inside a transaction', async () => {
      await relay.relayBatch();

      expect(outbox.claimUnpublished).toHaveBeenCalledWith(OUTBOX_BATCH_SIZE, manager);
    });

    it('publishes the claimed events in order, as Kafka messages keyed by the order', async () => {
      const first = anEvent('7d1e5c2a-4b3f-4e8a-9c1d-2f3a4b5c6d7e', 'c-1');
      const second = anEvent('8e2f6d3b-5c40-4f9b-8d2e-3a4b5c6d7e8f', 'c-2');
      outbox.claimUnpublished.mockResolvedValue([anOutboxRow(first), anOutboxRow(second)]);

      await relay.relayBatch();

      expect(publish).toHaveBeenCalledOnce();
      expect(publish).toHaveBeenCalledWith([
        {
          topic: 'orders.events',
          key: first.aggregateId,
          value: JSON.stringify(first),
          headers: {
            'x-event-id': first.eventId,
            'x-event-type': 'OrderConfirmed',
            'x-correlation-id': 'c-1',
          },
        },
        {
          topic: 'orders.events',
          key: second.aggregateId,
          value: JSON.stringify(second),
          headers: {
            'x-event-id': second.eventId,
            'x-event-type': 'OrderConfirmed',
            'x-correlation-id': 'c-2',
          },
        },
      ]);
    });

    it('marks the events published in the same transaction, after Kafka has them, and returns how many', async () => {
      const rows = [
        anOutboxRow(anEvent()),
        anOutboxRow(anEvent('8e2f6d3b-5c40-4f9b-8d2e-3a4b5c6d7e8f')),
      ];
      outbox.claimUnpublished.mockResolvedValue(rows);
      const calls: string[] = [];
      publish.mockImplementation(() => {
        calls.push('publish');
        return Promise.resolve();
      });
      outbox.markPublished.mockImplementation(() => {
        calls.push('markPublished');
        return Promise.resolve();
      });

      expect(await relay.relayBatch()).toBe(2);

      expect(calls).toEqual(['publish', 'markPublished']);
      expect(outbox.markPublished).toHaveBeenCalledWith(
        rows.map(({ id }) => id),
        manager,
      );
    });

    describe('when Kafka refuses the messages', () => {
      const kafkaDown = new Error('broker not available');

      beforeEach(() => {
        outbox.claimUnpublished.mockResolvedValue([anOutboxRow(anEvent())]);
        publish.mockRejectedValue(kafkaDown);
      });

      it('leaves the events unpublished and passes the error on', async () => {
        await expect(relay.relayBatch()).rejects.toBe(kafkaDown);

        expect(outbox.markPublished).not.toHaveBeenCalled();
      });

      it('counts one more failed attempt for each event, outside the rolled-back transaction', async () => {
        const row = anOutboxRow(anEvent());
        outbox.claimUnpublished.mockResolvedValue([row]);

        await expect(relay.relayBatch()).rejects.toBe(kafkaDown);

        expect(outbox.recordFailedAttempt).toHaveBeenCalledWith([row.id]);
        expect(transaction).toHaveBeenCalledTimes(1);
      });

      it('still reports the Kafka error when the attempt cannot be counted', async () => {
        outbox.recordFailedAttempt.mockRejectedValue(new Error('database down too'));

        await expect(relay.relayBatch()).rejects.toBe(kafkaDown);
      });
    });

    it('passes on a database error from claiming, without counting attempts', async () => {
      const failure = new Error('connection lost');
      outbox.claimUnpublished.mockRejectedValue(failure);

      await expect(relay.relayBatch()).rejects.toBe(failure);

      expect(outbox.recordFailedAttempt).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('deletes events published more than 7 days ago', async () => {
      const now = new Date('2026-11-26T10:00:00.000Z');
      outbox.deletePublishedBefore.mockResolvedValue(42);

      expect(await relay.cleanup(now)).toBe(42);

      expect(outbox.deletePublishedBefore).toHaveBeenCalledWith(
        new Date(now.getTime() - OUTBOX_RETENTION_MS),
      );
      expect(OUTBOX_RETENTION_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});
