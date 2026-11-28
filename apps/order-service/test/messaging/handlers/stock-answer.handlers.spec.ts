import { EventType } from '@app/contracts';
import { StockReservationFailedHandler } from '../../../src/messaging/handlers/stock-reservation-failed.handler.js';
import { StockReservedHandler } from '../../../src/messaging/handlers/stock-reserved.handler.js';
import type { OrderSagaService } from '../../../src/services/order-saga.service.js';
import { aStockReservationFailed, aStockReserved } from '../../builders/stock-events.builder.js';

describe('StockReservedHandler', () => {
  it('handles StockReserved', () => {
    expect(new StockReservedHandler({} as OrderSagaService).eventType).toBe(
      EventType.STOCK_RESERVED,
    );
  });

  it('gives the whole event to the saga service, which links its next event to it', async () => {
    const stockReserved = vi.fn().mockResolvedValue(true);
    const event = aStockReserved();

    await new StockReservedHandler({
      stockReserved,
    } as unknown as OrderSagaService).handle(event);

    expect(stockReserved).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('passes on an error from the service', async () => {
    const failure = new Error('database down');
    const handler = new StockReservedHandler({
      stockReserved: vi.fn().mockRejectedValue(failure),
    } as unknown as OrderSagaService);

    await expect(handler.handle(aStockReserved())).rejects.toBe(failure);
  });
});

describe('StockReservationFailedHandler', () => {
  it('handles StockReservationFailed', () => {
    expect(new StockReservationFailedHandler({} as OrderSagaService).eventType).toBe(
      EventType.STOCK_RESERVATION_FAILED,
    );
  });

  it('gives the whole event to the saga service', async () => {
    const stockReservationFailed = vi.fn().mockResolvedValue(true);
    const event = aStockReservationFailed();

    await new StockReservationFailedHandler({
      stockReservationFailed,
    } as unknown as OrderSagaService).handle(event);

    expect(stockReservationFailed).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('passes on an error from the service', async () => {
    const failure = new Error('database down');
    const handler = new StockReservationFailedHandler({
      stockReservationFailed: vi.fn().mockRejectedValue(failure),
    } as unknown as OrderSagaService);

    await expect(handler.handle(aStockReservationFailed())).rejects.toBe(failure);
  });
});
