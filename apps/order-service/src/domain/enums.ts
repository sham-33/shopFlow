// Values stored in varchar columns, each limited by a CHECK constraint built
// with sqlIn(). Never rename a value: rows and events already contain it.

/** Where an order is in its life. OrderStateMachine decides which moves are allowed. */
export enum OrderStatus {
  /** Saved, waiting for the stock check. */
  PENDING = 'PENDING',
  /** Stock reserved, payment requested. */
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  /** Paid; the stock is sold. */
  CONFIRMED = 'CONFIRMED',
  /** Out of stock; nothing to undo. Final. */
  FAILED = 'FAILED',
  /** Cancelled by the customer or because payment failed. */
  CANCELLED = 'CANCELLED',
  /** Money returned after a paid order was cancelled. Final. */
  REFUNDED = 'REFUNDED',
}

// Also sent in events, so the one definition lives in the contracts library.
export { CancelReason, PaymentMethod } from '@app/contracts';

export enum CouponType {
  /** A percentage off the subtotal (percent_off). */
  PERCENTAGE = 'PERCENTAGE',
  /** A fixed amount off the subtotal (amount_off), never more than the subtotal. */
  FLAT = 'FLAT',
  /** Buy one, get one free: every second unit of each item is free. */
  BOGO = 'BOGO',
}
