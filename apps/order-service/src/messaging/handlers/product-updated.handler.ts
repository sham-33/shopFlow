import { type EventEnvelope, EventType } from '@app/contracts';
import type { EventHandler } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { CatalogService } from '../../services/catalog.service.js';

/** products.events → product_catalog. Reads the event and calls the service, nothing more. */
@Injectable()
export class ProductUpdatedHandler implements EventHandler<EventType.PRODUCT_UPDATED> {
  public readonly eventType = EventType.PRODUCT_UPDATED;

  constructor(private readonly catalog: CatalogService) {}

  public async handle(event: EventEnvelope<EventType.PRODUCT_UPDATED>): Promise<void> {
    await this.catalog.applyProductUpdated(event.eventId, event.payload);
  }
}
