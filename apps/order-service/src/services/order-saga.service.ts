import { causedBy, createEvent, type EventEnvelope, EventType } from '@app/contracts';
import { IdempotentConsumer, OutboxService } from '@app/messaging';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { CONSUMER_NAMES, STATUS_CHANGE_REASONS } from '../constants.js';
import { OrderStatus } from '../domain/enums.js';
import { OrderStateMachine } from '../domain/order-state-machine.js';
import type { Order } from '../entities/order.entity.js';
import { OrderChangedConcurrentlyException } from '../exceptions/order-changed-concurrently.exception.js';
import { toOrderPaymentRequestedPayload } from '../mappers/order-event.mapper.js';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
  type StatusChange,
} from '../repository/order.repository.js';

/** Work done in the transaction of a status change, for example writing the next event. */
type AfterChange = (order: Order, manager: EntityManager) => Promise<void>;

/**
 * The order service's steps of the Saga (docs/plan.md, section 5): it moves an
 * order on when another service answers, and asks for the next step.
 */
@Injectable()
export class OrderSagaService {
  private readonly logger = new Logger(OrderSagaService.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly stateMachine: OrderStateMachine,
    private readonly outbox: OutboxService,
    private readonly idempotent: IdempotentConsumer,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Every item is held: the order waits for payment, and the payment service
   * is asked to charge the total.
   *
   * @returns false if this event was already handled.
   */
  public stockReserved(event: EventEnvelope<EventType.STOCK_RESERVED>): Promise<boolean> {
    return this.advance(
      event,
      event.payload.orderId,
      {
        to: OrderStatus.AWAITING_PAYMENT,
        reason: STATUS_CHANGE_REASONS.STOCK_RESERVED,
      },
      (order, manager) =>
        this.outbox.add(
          manager,
          createEvent(
            EventType.ORDER_PAYMENT_REQUESTED,
            toOrderPaymentRequestedPayload(order),
            causedBy(event),
          ),
        ),
    );
  }

  /**
   * Not enough stock: the order fails. Inventory reserved nothing, so there
   * is nothing to undo and no event to send.
   *
   * @returns false if this event was already handled.
   */
  public stockReservationFailed(
    event: EventEnvelope<EventType.STOCK_RESERVATION_FAILED>,
  ): Promise<boolean> {
    return this.advance(event, event.payload.orderId, {
      to: OrderStatus.FAILED,
      reason: STATUS_CHANGE_REASONS.OUT_OF_STOCK,
    });
  }

  /**
   * Moves the order to `change.to` and runs `after`, in one transaction with
   * the processed_events record.
   *
   * - An answer the order can no longer take (it was cancelled meanwhile) is
   *   logged and skipped: retrying would never make it valid.
   * - If the order changes between the read and the update, this throws, so
   *   everything rolls back and the message is read again. The next attempt
   *   sees the new status and decides again.
   */
  private advance(
    event: EventEnvelope,
    orderId: string,
    change: StatusChange,
    after?: AfterChange,
  ): Promise<boolean> {
    return this.dataSource.transaction((manager) =>
      this.idempotent.run(manager, CONSUMER_NAMES.ORDER_STATUS, event.eventId, async () => {
        const order = await this.orders.findById(orderId, manager);
        if (!order) {
          // The order and its OrderCreated were saved together, so only a
          // wiped database gets here. Retrying cannot help.
          this.logger.error(
            `Skipped ${event.eventType} ${event.eventId}: it names order ${orderId}, which does not exist`,
          );
          return;
        }
        if (!this.stateMachine.canMove(order.status, change.to)) {
          this.logger.warn(
            `Skipped ${event.eventType} for order ${orderId}: it is ${order.status} and cannot become ${change.to}`,
          );
          return;
        }
        if (
          !(await this.orders.changeStatus(order.id, order.version, order.status, change, manager))
        ) {
          throw new OrderChangedConcurrentlyException(order.id);
        }
        await after?.(order, manager);
        this.logger.log(`Order ${orderId}: ${order.status} -> ${change.to} on ${event.eventType}`);
      }),
    );
  }
}
