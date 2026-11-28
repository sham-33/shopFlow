import { EventType } from '@app/contracts';
import { OrderCreatedHandler } from '../../../src/messaging/handlers/order-created.handler.js';
import type { StockReservationsService } from '../../../src/services/stock-reservations.service.js';
import { anOrderCreated } from '../../builders/reservation.builder.js';

describe('OrderCreatedHandler', () => {
  it('handles OrderCreated', () => {
    expect(new OrderCreatedHandler({} as StockReservationsService).eventType).toBe(
      EventType.ORDER_CREATED,
    );
  });

  it('gives the whole event to the reservation service, which links its answer to it', async () => {
    const reserveForOrder = vi.fn().mockResolvedValue(true);
    const handler = new OrderCreatedHandler({
      reserveForOrder,
    } as unknown as StockReservationsService);
    const event = anOrderCreated();

    await handler.handle(event);

    expect(reserveForOrder).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('passes on an error from the service', async () => {
    const failure = new Error('database down');
    const handler = new OrderCreatedHandler({
      reserveForOrder: vi.fn().mockRejectedValue(failure),
    } as unknown as StockReservationsService);

    await expect(handler.handle(anOrderCreated())).rejects.toBe(failure);
  });
});
