import { createEvent, EventType } from '@app/contracts';
import { ProductUpdatedHandler } from '../../../src/messaging/handlers/product-updated.handler.js';
import type { CatalogService } from '../../../src/services/catalog.service.js';
import { SHIRT_ID } from '../../builders/order.builder.js';

describe('ProductUpdatedHandler', () => {
  const payload = {
    productId: SHIRT_ID,
    sku: 'TSHIRT-RED-M',
    name: 'Red T-shirt (M)',
    price: 499.5,
    active: true,
  };

  it('handles ProductUpdated', () => {
    expect(new ProductUpdatedHandler({} as CatalogService).eventType).toBe(
      EventType.PRODUCT_UPDATED,
    );
  });

  it('gives the event ID and the payload to the catalog service, and nothing else', async () => {
    const applyProductUpdated = vi.fn().mockResolvedValue(true);
    const handler = new ProductUpdatedHandler({ applyProductUpdated } as unknown as CatalogService);
    const event = createEvent(EventType.PRODUCT_UPDATED, payload, {
      correlationId: 'c-1',
      causationId: null,
    });

    await handler.handle(event);

    expect(applyProductUpdated).toHaveBeenCalledExactlyOnceWith(event.eventId, event.payload);
  });

  it('passes on an error from the service', async () => {
    const failure = new Error('database down');
    const handler = new ProductUpdatedHandler({
      applyProductUpdated: vi.fn().mockRejectedValue(failure),
    } as unknown as CatalogService);
    const event = createEvent(EventType.PRODUCT_UPDATED, payload, {
      correlationId: 'c-1',
      causationId: null,
    });

    await expect(handler.handle(event)).rejects.toBe(failure);
  });
});
