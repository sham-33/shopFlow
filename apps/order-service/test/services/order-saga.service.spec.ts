import { type AnyEvent, EventType } from '@app/contracts';
import type { IdempotentConsumer, OutboxService } from '@app/messaging';
import { Logger } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import type { Mocked } from 'vitest';
import { OrderStatus, PaymentMethod } from '../../src/domain/enums.js';
import { OrderStateMachine } from '../../src/domain/order-state-machine.js';
import { OrderChangedConcurrentlyException } from '../../src/exceptions/order-changed-concurrently.exception.js';
import type { OrderRepository } from '../../src/repository/order.repository.js';
import { OrderSagaService } from '../../src/services/order-saga.service.js';
import { CUSTOMER_ID, ORDER_ID, anOrder } from '../builders/order.builder.js';
import { aStockReservationFailed, aStockReserved } from '../builders/stock-events.builder.js';

describe('OrderSagaService', () => {
  const manager = { name: 'transaction manager' } as unknown as EntityManager;
  let orders: Mocked<OrderRepository>;
  let addToOutbox: ReturnType<typeof vi.fn<OutboxService['add']>>;
  let run: ReturnType<typeof vi.fn<IdempotentConsumer['run']>>;
  let service: OrderSagaService;

  /** The events written to the outbox, in order. */
  const eventsWritten = (): AnyEvent[] => addToOutbox.mock.calls.map(([, event]) => event);

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    orders = {
      findById: vi.fn<OrderRepository['findById']>().mockResolvedValue(anOrder()),
      findByIdempotencyKey: vi.fn<OrderRepository['findByIdempotencyKey']>(),
      list: vi.fn<OrderRepository['list']>(),
      insert: vi.fn<OrderRepository['insert']>(),
      changeStatus: vi.fn<OrderRepository['changeStatus']>().mockResolvedValue(true),
    };
    addToOutbox = vi.fn<OutboxService['add']>().mockResolvedValue(undefined);
    // A first delivery: runs the work, as IdempotentConsumer does.
    run = vi
      .fn<IdempotentConsumer['run']>()
      .mockImplementation(async (_manager, _consumer, _eventId, work) => {
        await work();
        return true;
      });
    service = new OrderSagaService(
      orders,
      new OrderStateMachine(),
      { add: addToOutbox } as unknown as OutboxService,
      { run } as unknown as IdempotentConsumer,
      {
        transaction: (work: (m: EntityManager) => Promise<unknown>) => work(manager),
      } as unknown as DataSource,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Both answers share the rules for reading, checking and changing the order. */
  const answers = [
    {
      name: 'StockReserved',
      handle: (s: OrderSagaService): Promise<boolean> => s.stockReserved(aStockReserved()),
      to: OrderStatus.AWAITING_PAYMENT,
    },
    {
      name: 'StockReservationFailed',
      handle: (s: OrderSagaService): Promise<boolean> =>
        s.stockReservationFailed(aStockReservationFailed()),
      to: OrderStatus.FAILED,
    },
  ];

  describe('stockReserved', () => {
    it('moves the PENDING order to AWAITING_PAYMENT, if nobody changed it since it was read', async () => {
      orders.findById.mockResolvedValue(anOrder({ version: 3 }));

      expect(await service.stockReserved(aStockReserved())).toBe(true);

      expect(orders.findById).toHaveBeenCalledWith(ORDER_ID, manager);
      expect(orders.changeStatus).toHaveBeenCalledExactlyOnceWith(
        ORDER_ID,
        3,
        OrderStatus.PENDING,
        { to: OrderStatus.AWAITING_PAYMENT, reason: 'Stock reserved' },
        manager,
      );
    });

    it('asks for payment of the total in rupees, in the same transaction, caused by StockReserved', async () => {
      orders.findById.mockResolvedValue(
        anOrder({
          totalPaise: 107909,
          discountPaise: 11990,
          subtotalPaise: 119899,
        }),
      );
      const stockReserved = aStockReserved();

      await service.stockReserved(stockReserved);

      expect(addToOutbox).toHaveBeenCalledExactlyOnceWith(manager, expect.anything());
      expect(eventsWritten()[0]).toMatchObject({
        eventType: EventType.ORDER_PAYMENT_REQUESTED,
        aggregateId: ORDER_ID,
        correlationId: 'c-91ab',
        causationId: stockReserved.eventId,
        producer: 'order-service',
        payload: {
          orderId: ORDER_ID,
          customerId: CUSTOMER_ID,
          amount: 1079.09,
          currency: 'INR',
          paymentMethod: PaymentMethod.WALLET,
        },
      });
    });

    it('records the event under the order-status consumer name, in the same transaction', async () => {
      const stockReserved = aStockReserved();

      await service.stockReserved(stockReserved);

      expect(run).toHaveBeenCalledWith(
        manager,
        'order-service.order-status',
        stockReserved.eventId,
        expect.any(Function),
      );
    });
  });

  describe('stockReservationFailed', () => {
    it('moves the PENDING order to FAILED', async () => {
      expect(await service.stockReservationFailed(aStockReservationFailed())).toBe(true);

      expect(orders.changeStatus).toHaveBeenCalledExactlyOnceWith(
        ORDER_ID,
        1,
        OrderStatus.PENDING,
        { to: OrderStatus.FAILED, reason: 'Not enough stock' },
        manager,
      );
    });

    it('writes no event: nothing was reserved, so nothing needs undoing', async () => {
      await service.stockReservationFailed(aStockReservationFailed());

      expect(addToOutbox).not.toHaveBeenCalled();
    });

    it('records the event under the order-status consumer name', async () => {
      const failed = aStockReservationFailed();

      await service.stockReservationFailed(failed);

      expect(run).toHaveBeenCalledWith(
        manager,
        'order-service.order-status',
        failed.eventId,
        expect.any(Function),
      );
    });
  });

  describe.each(answers)('$name, like every answer', ({ handle, to }) => {
    it('does nothing for an event it has already handled, and says so', async () => {
      run.mockResolvedValue(false);

      expect(await handle(service)).toBe(false);

      expect(orders.changeStatus).not.toHaveBeenCalled();
      expect(addToOutbox).not.toHaveBeenCalled();
    });

    it.each([
      OrderStatus.CANCELLED,
      OrderStatus.AWAITING_PAYMENT,
      OrderStatus.CONFIRMED,
      OrderStatus.FAILED,
      OrderStatus.REFUNDED,
    ])('skips an order that is already %s, logging why, instead of failing', async (status) => {
      orders.findById.mockResolvedValue(anOrder({ status }));

      expect(await handle(service)).toBe(true);

      expect(orders.changeStatus).not.toHaveBeenCalled();
      expect(addToOutbox).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining(`it is ${status} and cannot become ${to}`),
      );
    });

    it('fails, writing nothing, when the order changed after it was read, so the message is read again', async () => {
      orders.changeStatus.mockResolvedValue(false);

      await expect(handle(service)).rejects.toBeInstanceOf(OrderChangedConcurrentlyException);
      expect(addToOutbox).not.toHaveBeenCalled();
    });

    it('skips an answer for an order this service does not have, logging it as an error', async () => {
      orders.findById.mockResolvedValue(null);

      expect(await handle(service)).toBe(true);

      expect(orders.changeStatus).not.toHaveBeenCalled();
      expect(addToOutbox).not.toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining(`order ${ORDER_ID}, which does not exist`),
      );
    });

    it('passes on a database error, so the message is read again', async () => {
      const failure = new Error('connection terminated');
      orders.findById.mockRejectedValue(failure);

      await expect(handle(service)).rejects.toBe(failure);
    });
  });

  it('skips StockReserved for an order the customer cancelled in the meantime, on the second read', async () => {
    // First delivery: the customer's cancel wins the race. Second delivery:
    // the order is CANCELLED, so the answer is too late.
    orders.findById
      .mockResolvedValueOnce(anOrder({ status: OrderStatus.PENDING, version: 1 }))
      .mockResolvedValueOnce(anOrder({ status: OrderStatus.CANCELLED, version: 2 }));
    orders.changeStatus.mockResolvedValueOnce(false);
    const stockReserved = aStockReserved();

    await expect(service.stockReserved(stockReserved)).rejects.toBeInstanceOf(
      OrderChangedConcurrentlyException,
    );
    expect(await service.stockReserved(stockReserved)).toBe(true);

    expect(orders.changeStatus).toHaveBeenCalledOnce();
    expect(addToOutbox).not.toHaveBeenCalled();
  });
});
