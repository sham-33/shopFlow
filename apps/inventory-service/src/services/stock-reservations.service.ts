import {
  type AnyEvent,
  causedBy,
  createEvent,
  type EventEnvelope,
  EventType,
  type OrderedItem,
  type UnavailableItem,
} from '@app/contracts';
import { IdempotentConsumer, OutboxService } from '@app/messaging';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { CONSUMER_NAMES } from '../constants.js';
import { ReservationStatus } from '../domain/enums.js';
import type { StockReservation } from '../entities/stock-reservation.entity.js';
import {
  STOCK_RESERVATION_REPOSITORY,
  type StockReservationRepository,
} from '../repository/stock-reservation.repository.js';
import { STOCK_REPOSITORY, type StockRepository } from '../repository/stock.repository.js';

/**
 * Thrown inside the reservation savepoint to roll it back when an item is
 * short. It never leaves this file: reserveAll() turns it into the list of
 * unavailable items.
 */
class NotEnoughStock extends Error {
  constructor(public readonly items: OrderedItem[]) {
    super('Not enough stock');
  }
}

type Reservation =
  | { reserved: true; reservations: StockReservation[] }
  | { reserved: false; shortItems: OrderedItem[] };

/** Holds stock for orders: reserve on OrderCreated (commit and release come in Week 4). */
@Injectable()
export class StockReservationsService {
  private readonly logger = new Logger(StockReservationsService.name);

  constructor(
    @Inject(STOCK_REPOSITORY) private readonly stock: StockRepository,
    @Inject(STOCK_RESERVATION_REPOSITORY)
    private readonly reservations: StockReservationRepository,
    private readonly outbox: OutboxService,
    private readonly idempotent: IdempotentConsumer,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Reserves every item of a new order, or none of them, and answers with
   * StockReserved or StockReservationFailed. The stock change, the answer
   * and the processed_events record commit together.
   *
   * @returns false if this OrderCreated was already handled.
   */
  public async reserveForOrder(
    orderCreated: EventEnvelope<EventType.ORDER_CREATED>,
  ): Promise<boolean> {
    const { orderId, items } = orderCreated.payload;
    return this.dataSource.transaction((manager) =>
      this.idempotent.run(
        manager,
        CONSUMER_NAMES.STOCK_RESERVATION,
        orderCreated.eventId,
        async () => {
          const result = await this.reserveAll(orderId, items, manager);
          const answer: AnyEvent = result.reserved
            ? createEvent(
                EventType.STOCK_RESERVED,
                {
                  orderId,
                  reservationIds: result.reservations.map(({ id }) => id),
                },
                causedBy(orderCreated),
              )
            : createEvent(
                EventType.STOCK_RESERVATION_FAILED,
                {
                  orderId,
                  unavailableItems: await this.unavailable(result.shortItems, manager),
                },
                causedBy(orderCreated),
              );
          await this.outbox.add(manager, answer);
          this.logger.log(
            result.reserved
              ? `Reserved ${items.length} item(s) for order ${orderId}`
              : `Not enough stock for order ${orderId}: ${result.shortItems.length} item(s) short`,
          );
        },
      ),
    );
  }

  /**
   * One conditional UPDATE per item inside a savepoint. If any item is short,
   * the savepoint is rolled back, which undoes the items already reserved
   * and releases their row locks, while the outer transaction stays usable
   * for the failure answer.
   */
  private async reserveAll(
    orderId: string,
    items: OrderedItem[],
    manager: EntityManager,
  ): Promise<Reservation> {
    try {
      const reservations = await manager.transaction(async (savepoint) => {
        const short: OrderedItem[] = [];
        // Every transaction locks stock rows in the same order, so two orders
        // that share products wait for each other instead of deadlocking.
        // Keep going after a short item to report all of them.
        for (const item of byProductId(items)) {
          if (!(await this.stock.reserve(item.productId, item.quantity, savepoint))) {
            short.push(item);
          }
        }
        if (short.length > 0) {
          throw new NotEnoughStock(short);
        }
        return this.reservations.insert(
          items.map(({ productId, quantity }) => ({
            orderId,
            productId,
            quantity,
            status: ReservationStatus.RESERVED,
          })),
          savepoint,
        );
      });
      return { reserved: true, reservations };
    } catch (error) {
      if (error instanceof NotEnoughStock) {
        return { reserved: false, shortItems: error.items };
      }
      throw error;
    }
  }

  /**
   * What each short item asked for and what is available now. Read after the
   * rollback, so it is for information: stock may change again at any moment.
   */
  private async unavailable(
    shortItems: OrderedItem[],
    manager: EntityManager,
  ): Promise<UnavailableItem[]> {
    const available = await this.stock.availableQuantities(
      shortItems.map(({ productId }) => productId),
      manager,
    );
    return shortItems.map(({ productId, quantity }) => ({
      productId,
      requested: quantity,
      // No stock row: the inventory does not know the product.
      available: available.get(productId) ?? 0,
    }));
  }
}

/** Sorted by plain string order, which is the same in every process, whatever its locale. */
function byProductId(items: OrderedItem[]): OrderedItem[] {
  return [...items].sort((a, b) =>
    a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
  );
}
