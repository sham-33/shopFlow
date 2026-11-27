import type { OutboxRepository } from '../../src/outbox/outbox.repository.js';
import { OutboxService } from '../../src/outbox/outbox.service.js';
import { aManager, anEvent } from '../builders/outbox.builder.js';

describe('OutboxService', () => {
  it('stores the event with the topic and key from its definition, in the caller’s transaction', async () => {
    const add = vi.fn<OutboxRepository['add']>().mockResolvedValue(undefined);
    const service = new OutboxService({ add } as unknown as OutboxRepository);
    const manager = aManager();
    const event = anEvent();

    await service.add(manager, event);

    expect(add).toHaveBeenCalledWith(
      {
        id: event.eventId,
        topic: 'orders.events',
        messageKey: event.aggregateId,
        eventType: 'OrderConfirmed',
        payload: event,
      },
      manager,
    );
  });
});
