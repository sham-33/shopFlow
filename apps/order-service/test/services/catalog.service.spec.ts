import type { ProductUpdatedPayload } from '@app/contracts';
import type { IdempotentConsumer } from '@app/messaging';
import type { DataSource, EntityManager } from 'typeorm';
import type { Mocked } from 'vitest';
import type { CatalogRepository } from '../../src/repository/catalog.repository.js';
import { CatalogService } from '../../src/services/catalog.service.js';
import { SHIRT_ID } from '../builders/order.builder.js';

const EVENT_ID = '5f0c8a2e-1b7d-4c3a-9e21-0d4f6a7b8c90';
const payload: ProductUpdatedPayload = {
  productId: SHIRT_ID,
  sku: 'TSHIRT-RED-M',
  name: 'Red T-shirt (M)',
  price: 499.5,
  active: true,
};

describe('CatalogService', () => {
  const manager = { name: 'transaction manager' } as unknown as EntityManager;
  let catalog: Mocked<CatalogRepository>;
  let run: ReturnType<typeof vi.fn<IdempotentConsumer['run']>>;
  let transaction: ReturnType<typeof vi.fn>;
  let service: CatalogService;

  beforeEach(() => {
    catalog = {
      findByIds: vi.fn<CatalogRepository['findByIds']>(),
      upsert: vi.fn<CatalogRepository['upsert']>().mockResolvedValue(undefined),
    };
    // A first delivery: runs the work, as IdempotentConsumer does.
    run = vi
      .fn<IdempotentConsumer['run']>()
      .mockImplementation(async (_manager, _consumer, _eventId, work) => {
        await work();
        return true;
      });
    transaction = vi.fn((work: (m: EntityManager) => Promise<unknown>) => work(manager));
    service = new CatalogService(
      catalog,
      { run } as unknown as IdempotentConsumer,
      { transaction } as unknown as DataSource,
    );
  });

  describe('applyProductUpdated', () => {
    it('stores the product with its price in paise, in the transaction that records the event', async () => {
      expect(await service.applyProductUpdated(EVENT_ID, payload)).toBe(true);

      expect(run).toHaveBeenCalledWith(
        manager,
        'order-service.catalog-sync',
        EVENT_ID,
        expect.any(Function),
      );
      expect(catalog.upsert).toHaveBeenCalledWith(
        {
          productId: SHIRT_ID,
          sku: 'TSHIRT-RED-M',
          name: 'Red T-shirt (M)',
          pricePaise: 49950,
          active: true,
        },
        manager,
      );
    });

    it.each([
      [0, 0],
      [0.01, 1],
      [19.99, 1999],
      [1.1, 110],
      [9_999_999_999.99, 999_999_999_999],
    ])('turns %s rupees into %s paise without rounding errors', async (price, pricePaise) => {
      await service.applyProductUpdated(EVENT_ID, { ...payload, price });

      expect(catalog.upsert).toHaveBeenCalledWith(expect.objectContaining({ pricePaise }), manager);
    });

    it('keeps an inactive product in the catalog, marked inactive, so orders for it are refused', async () => {
      await service.applyProductUpdated(EVENT_ID, { ...payload, active: false });

      expect(catalog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
        manager,
      );
    });

    it('does nothing for an event it has already handled, and says so', async () => {
      run.mockResolvedValue(false);

      expect(await service.applyProductUpdated(EVENT_ID, payload)).toBe(false);

      expect(catalog.upsert).not.toHaveBeenCalled();
    });

    it('passes on a database error, so the message is read again', async () => {
      const failure = new Error('deadlock detected');
      catalog.upsert.mockRejectedValue(failure);

      await expect(service.applyProductUpdated(EVENT_ID, payload)).rejects.toBe(failure);
    });
  });
});
