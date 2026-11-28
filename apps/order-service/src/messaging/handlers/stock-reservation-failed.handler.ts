import { type EventEnvelope, EventType } from '@app/contracts';
import type { EventHandler } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { OrderSagaService } from '../../services/order-saga.service.js';

/** inventory.events → FAILED. Reads the event and calls the service, nothing more. */
@Injectable()
export class StockReservationFailedHandler implements EventHandler<EventType.STOCK_RESERVATION_FAILED> {
  public readonly eventType = EventType.STOCK_RESERVATION_FAILED;

  constructor(private readonly saga: OrderSagaService) {}

  public async handle(event: EventEnvelope<EventType.STOCK_RESERVATION_FAILED>): Promise<void> {
    await this.saga.stockReservationFailed(event);
  }
}
