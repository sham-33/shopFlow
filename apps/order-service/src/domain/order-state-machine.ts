import { InvalidOrderStateException } from '../exceptions/invalid-order-state.exception.js';
import { OrderStatus } from './enums.js';

/**
 * The only place that decides which status moves an order may make
 * (docs/plan.md, section 3.1). Services ask it before every change, so the
 * rules live in one small class that is easy to read and to test.
 *
 * It knows only statuses. Other rules, such as which cancel reason fits which
 * status, belong to the service.
 */
export class OrderStateMachine {
  private static readonly NEXT: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
    [OrderStatus.PENDING]: [
      OrderStatus.AWAITING_PAYMENT, // stock reserved
      OrderStatus.FAILED, // out of stock
      OrderStatus.CANCELLED, // customer cancelled before the stock check finished
    ],
    [OrderStatus.AWAITING_PAYMENT]: [
      OrderStatus.CONFIRMED, // payment completed
      OrderStatus.CANCELLED, // payment failed, or the customer cancelled
    ],
    // A customer may cancel a paid order; the payment service then refunds it.
    [OrderStatus.CONFIRMED]: [OrderStatus.CANCELLED],
    [OrderStatus.FAILED]: [],
    // Allowed without checking that the order was paid: a PaymentRefunded event
    // is itself the proof. The order may never have reached CONFIRMED, for
    // example when the customer cancelled while the charge was in flight.
    [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
    [OrderStatus.REFUNDED]: [],
  };

  /** The statuses an order in `from` may move to. Empty for a final status. */
  public nextStatuses(from: OrderStatus): readonly OrderStatus[] {
    return OrderStateMachine.NEXT[from];
  }

  /**
   * Whether the move is allowed. Event handlers use this to skip an event that
   * arrives too late (for example PaymentCompleted after the order was
   * cancelled) instead of failing on it.
   */
  public canMove(from: OrderStatus, to: OrderStatus): boolean {
    return this.nextStatuses(from).includes(to);
  }

  /** A final status has no way out. */
  public isFinal(status: OrderStatus): boolean {
    return this.nextStatuses(status).length === 0;
  }

  /** Throws InvalidOrderStateException (409 INVALID_ORDER_STATE) unless the move is allowed. */
  public assertCanMove(orderId: string, from: OrderStatus, to: OrderStatus): void {
    if (!this.canMove(from, to)) {
      throw new InvalidOrderStateException(orderId, from, to);
    }
  }
}
