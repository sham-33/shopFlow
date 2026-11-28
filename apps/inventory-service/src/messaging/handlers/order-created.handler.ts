import { type EventEnvelope, EventType } from '@app/contracts';
import type { EventHandler } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { StockReservationsService } from '../../services/stock-reservations.service.js';

/** orders.events → stock reservation. Reads the event and calls the service, nothing more. */
@Injectable()
export class OrderCreatedHandler implements EventHandler<EventType.ORDER_CREATED> {
  public readonly eventType = EventType.ORDER_CREATED;

  constructor(private readonly reservations: StockReservationsService) {}

  public async handle(event: EventEnvelope<EventType.ORDER_CREATED>): Promise<void> {
    await this.reservations.reserveForOrder(event);
  }
}
