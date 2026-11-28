import { type AnyEvent, EventType } from '@app/contracts';
import type { IdempotentConsumer, OutboxService } from '@app/messaging';
import type { DataSource, EntityManager } from 'typeorm';
import type { Mocked } from 'vitest';
import { ReservationStatus } from '../../src/domain/enums.js';
import type {
  NewReservation,
  StockReservationRepository,
} from '../../src/repository/stock-reservation.repository.js';
import type { StockRepository } from '../../src/repository/stock.repository.js';
import { StockReservationsService } from '../../src/services/stock-reservations.service.js';
import { PRODUCT_ID } from '../builders/product.builder.js';
import {
  CAP_ID,
  MUG_ID,
  ORDER_ID,
  aReservation,
  anOrderCreated,
  anOrderedItem,
} from '../builders/reservation.builder.js';

describe('StockReservationsService', () => {
  /** The manager of the savepoint inside the handler's transaction. */
  const savepoint = { name: 'savepoint' } as unknown as EntityManager;
  let savepointRolledBack: boolean;
  let manager: EntityManager;
  let stock: Mocked<StockRepository>;
  let reservations: Mocked<StockReservationRepository>;
  let addToOutbox: ReturnType<typeof vi.fn<OutboxService['add']>>;
  let run: ReturnType<typeof vi.fn<IdempotentConsumer['run']>>;
  let service: StockReservationsService;

  /** The events written to the outbox, in order. */
  const eventsWritten = (): AnyEvent[] => addToOutbox.mock.calls.map(([, event]) => event);

  /** Each product has this many units available; others have no stock row. */
  const givenAvailable = (available: Record<string, number>): void => {
    stock.reserve.mockImplementation((productId, quantity) =>
      Promise.resolve((available[productId] ?? -1) >= quantity),
    );
    stock.availableQuantities.mockImplementation((productIds) =>
      Promise.resolve(
        new Map(
          productIds
            .filter((id) => available[id] !== undefined)
            .map((id) => [id, available[id] as number]),
        ),
      ),
    );
  };

  beforeEach(() => {
    savepointRolledBack = false;
    // Like EntityManager.transaction inside a transaction: a savepoint that
    // is rolled back when the work throws.
    manager = {
      name: 'transaction manager',
      transaction: vi.fn(async (work: (m: EntityManager) => Promise<unknown>) => {
        try {
          return await work(savepoint);
        } catch (error) {
          savepointRolledBack = true;
          throw error;
        }
      }),
    } as unknown as EntityManager;
    stock = {
      reserve: vi.fn<StockRepository['reserve']>(),
      availableQuantities: vi.fn<StockRepository['availableQuantities']>(),
    };
    reservations = {
      insert: vi.fn<StockReservationRepository['insert']>((rows: NewReservation[]) =>
        Promise.resolve(rows.map((row) => aReservation(row))),
      ),
    };
    addToOutbox = vi.fn<OutboxService['add']>().mockResolvedValue(undefined);
    // A first delivery: runs the work, as IdempotentConsumer does.
    run = vi
      .fn<IdempotentConsumer['run']>()
      .mockImplementation(async (_manager, _consumer, _eventId, work) => {
        await work();
        return true;
      });
    service = new StockReservationsService(
      stock,
      reservations,
      { add: addToOutbox } as unknown as OutboxService,
      { run } as unknown as IdempotentConsumer,
      {
        transaction: (work: (m: EntityManager) => Promise<unknown>) => work(manager),
      } as unknown as DataSource,
    );
  });

  describe('reserveForOrder', () => {
    describe('when every item is in stock', () => {
      const orderCreated = anOrderCreated([
        anOrderedItem({ productId: PRODUCT_ID, quantity: 2 }),
        anOrderedItem({ productId: MUG_ID, quantity: 1 }),
      ]);

      beforeEach(() => {
        givenAvailable({ [PRODUCT_ID]: 2, [MUG_ID]: 5 });
      });

      it('reserves every item inside a savepoint', async () => {
        expect(await service.reserveForOrder(orderCreated)).toBe(true);

        expect(stock.reserve).toHaveBeenCalledWith(PRODUCT_ID, 2, savepoint);
        expect(stock.reserve).toHaveBeenCalledWith(MUG_ID, 1, savepoint);
        expect(savepointRolledBack).toBe(false);
      });

      it('records one RESERVED row per item, for this order', async () => {
        await service.reserveForOrder(orderCreated);

        expect(reservations.insert).toHaveBeenCalledExactlyOnceWith(
          expect.arrayContaining([
            {
              orderId: ORDER_ID,
              productId: PRODUCT_ID,
              quantity: 2,
              status: ReservationStatus.RESERVED,
            },
            {
              orderId: ORDER_ID,
              productId: MUG_ID,
              quantity: 1,
              status: ReservationStatus.RESERVED,
            },
          ]),
          savepoint,
        );
        expect(reservations.insert.mock.calls[0]?.[0]).toHaveLength(2);
      });

      it('writes StockReserved with the reservation IDs, caused by the OrderCreated', async () => {
        const shirt = aReservation({ id: 'aaaaaaaa-0000-4000-8000-00000000000a' });
        const mug = aReservation({ id: 'aaaaaaaa-0000-4000-8000-00000000000b', productId: MUG_ID });
        reservations.insert.mockResolvedValue([shirt, mug]);

        await service.reserveForOrder(orderCreated);

        expect(addToOutbox).toHaveBeenCalledExactlyOnceWith(manager, expect.anything());
        expect(eventsWritten()[0]).toMatchObject({
          eventType: EventType.STOCK_RESERVED,
          aggregateId: ORDER_ID,
          correlationId: 'c-91ab',
          causationId: orderCreated.eventId,
          producer: 'inventory-service',
          payload: {
            orderId: ORDER_ID,
            reservationIds: [shirt.id, mug.id],
          },
        });
      });

      it('records the event as handled under its own consumer name, in the same transaction', async () => {
        await service.reserveForOrder(orderCreated);

        expect(run).toHaveBeenCalledWith(
          manager,
          'inventory-service.stock-reservation',
          orderCreated.eventId,
          expect.any(Function),
        );
      });

      it('locks products in ID order, so two orders that share products cannot deadlock', async () => {
        givenAvailable({ [PRODUCT_ID]: 9, [MUG_ID]: 9, [CAP_ID]: 9 });
        const unsorted = anOrderCreated([
          anOrderedItem({ productId: MUG_ID }),
          anOrderedItem({ productId: CAP_ID }),
          anOrderedItem({ productId: PRODUCT_ID }),
        ]);

        await service.reserveForOrder(unsorted);

        expect(stock.reserve.mock.calls.map(([productId]) => productId)).toEqual([
          CAP_ID,
          PRODUCT_ID,
          MUG_ID,
        ]);
      });

      it('reserves the last units of a product', async () => {
        givenAvailable({ [PRODUCT_ID]: 1 });

        await service.reserveForOrder(
          anOrderCreated([anOrderedItem({ productId: PRODUCT_ID, quantity: 1 })]),
        );

        expect(eventsWritten()[0]?.eventType).toBe(EventType.STOCK_RESERVED);
      });
    });

    describe('when an item is short', () => {
      const orderCreated = anOrderCreated([
        anOrderedItem({ productId: PRODUCT_ID, quantity: 2 }),
        anOrderedItem({ productId: MUG_ID, quantity: 3 }),
      ]);

      beforeEach(() => {
        givenAvailable({ [PRODUCT_ID]: 10, [MUG_ID]: 2 });
      });

      it('reserves nothing: the savepoint with the items already reserved is rolled back', async () => {
        expect(await service.reserveForOrder(orderCreated)).toBe(true);

        expect(savepointRolledBack).toBe(true);
        expect(reservations.insert).not.toHaveBeenCalled();
      });

      it('writes StockReservationFailed with what was asked for and what is available', async () => {
        await service.reserveForOrder(orderCreated);

        expect(addToOutbox).toHaveBeenCalledExactlyOnceWith(manager, expect.anything());
        expect(eventsWritten()[0]).toMatchObject({
          eventType: EventType.STOCK_RESERVATION_FAILED,
          aggregateId: ORDER_ID,
          correlationId: 'c-91ab',
          causationId: orderCreated.eventId,
          payload: {
            orderId: ORDER_ID,
            unavailableItems: [{ productId: MUG_ID, requested: 3, available: 2 }],
          },
        });
      });

      it('reads the available quantities after the rollback, outside the savepoint', async () => {
        await service.reserveForOrder(orderCreated);

        expect(stock.availableQuantities).toHaveBeenCalledWith([MUG_ID], manager);
      });

      it('lists every short item, not only the first', async () => {
        givenAvailable({ [CAP_ID]: 0, [PRODUCT_ID]: 10, [MUG_ID]: 2 });
        const order = anOrderCreated([
          anOrderedItem({ productId: MUG_ID, quantity: 3 }),
          anOrderedItem({ productId: PRODUCT_ID, quantity: 2 }),
          anOrderedItem({ productId: CAP_ID, quantity: 1 }),
        ]);

        await service.reserveForOrder(order);

        expect(eventsWritten()[0]).toMatchObject({
          payload: {
            unavailableItems: [
              { productId: CAP_ID, requested: 1, available: 0 },
              { productId: MUG_ID, requested: 3, available: 2 },
            ],
          },
        });
      });

      it('reports 0 available for a product the inventory does not know', async () => {
        givenAvailable({ [PRODUCT_ID]: 10 });

        await service.reserveForOrder(
          anOrderCreated([anOrderedItem({ productId: MUG_ID, quantity: 1 })]),
        );

        expect(eventsWritten()[0]).toMatchObject({
          payload: {
            unavailableItems: [{ productId: MUG_ID, requested: 1, available: 0 }],
          },
        });
      });
    });

    it('does nothing for an OrderCreated it has already handled, and says so', async () => {
      run.mockResolvedValue(false);

      expect(await service.reserveForOrder(anOrderCreated())).toBe(false);

      expect(stock.reserve).not.toHaveBeenCalled();
      expect(addToOutbox).not.toHaveBeenCalled();
    });

    it('passes on a database error, writing no answer, so the message is read again', async () => {
      const failure = new Error('deadlock detected');
      stock.reserve.mockRejectedValue(failure);

      await expect(service.reserveForOrder(anOrderCreated())).rejects.toBe(failure);
      expect(stock.availableQuantities).not.toHaveBeenCalled();
      expect(addToOutbox).not.toHaveBeenCalled();
    });

    it('passes on an error from writing the answer, so nothing is kept', async () => {
      givenAvailable({ [PRODUCT_ID]: 10 });
      const failure = new Error('outbox insert failed');
      addToOutbox.mockRejectedValue(failure);

      await expect(service.reserveForOrder(anOrderCreated())).rejects.toBe(failure);
    });
  });
});
