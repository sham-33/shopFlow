import { type EventEnvelope, EventType } from '@app/contracts';
import type { EventHandler } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { OrderSagaService } from '../../services/order-saga.service.js';

/** inventory.events → AWAITING_PAYMENT. Reads the event and calls the service, nothing more. */
@Injectable()
export class StockReservedHandler implements EventHandler<EventType.STOCK_RESERVED> {
  public readonly eventType = EventType.STOCK_RESERVED;

  constructor(private readonly saga: OrderSagaService) {}

  public async handle(event: EventEnvelope<EventType.STOCK_RESERVED>): Promise<void> {
    await this.saga.stockReserved(event);
  }
}
