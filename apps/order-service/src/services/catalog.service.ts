import { rupeesToPaise } from '@app/common';
import type { ProductUpdatedPayload } from '@app/contracts';
import { IdempotentConsumer } from '@app/messaging';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CONSUMER_NAMES } from '../constants.js';
import { CATALOG_REPOSITORY, type CatalogRepository } from '../repository/catalog.repository.js';

/** Keeps the local product catalog in step with the inventory service. */
@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository,
    private readonly idempotent: IdempotentConsumer,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Stores the product exactly as the event describes it. The event carries the
   * product's whole state, so applying it twice, or after a missed event,
   * gives the same catalog.
   *
   * @returns false if this event was already applied.
   */
  public async applyProductUpdated(
    eventId: string,
    product: ProductUpdatedPayload,
  ): Promise<boolean> {
    return this.dataSource.transaction((manager) =>
      this.idempotent.run(manager, CONSUMER_NAMES.CATALOG_SYNC, eventId, () =>
        this.catalog.upsert(
          {
            productId: product.productId,
            sku: product.sku,
            name: product.name,
            pricePaise: rupeesToPaise(product.price),
            active: product.active,
          },
          manager,
        ),
      ),
    );
  }
}
