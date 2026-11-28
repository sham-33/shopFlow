// Values stored in varchar columns, each limited by a CHECK constraint built
// with sqlIn(). Never rename a value: rows already contain it.

/** Where the stock held for one order line is. */
export enum ReservationStatus {
  /** Moved from available to reserved; the order waits for payment. */
  RESERVED = 'RESERVED',
  /** The order was paid: the units are sold and leave reserved_qty. */
  COMMITTED = 'COMMITTED',
  /** The order was cancelled: the units went back to available_qty. */
  RELEASED = 'RELEASED',
}
