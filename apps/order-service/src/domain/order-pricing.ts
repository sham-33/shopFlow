import { MAX_ORDER_AMOUNT_PAISE } from '../constants.js';
import { OrderTotalTooLargeException } from '../exceptions/order-total-too-large.exception.js';

export interface PricedLine {
  quantity: number;
  unitPricePaise: number;
}

/**
 * Sum of quantity × unit price over the lines, in whole paise. Integer math
 * only, so there is no rounding error. Rejects a subtotal that would not fit
 * the numeric(12,2) column (or that JavaScript could not count exactly).
 */
export function calculateSubtotal(lines: readonly PricedLine[]): number {
  const subtotalPaise = lines.reduce(
    (sum, { quantity, unitPricePaise }) => sum + quantity * unitPricePaise,
    0,
  );
  if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise > MAX_ORDER_AMOUNT_PAISE) {
    throw new OrderTotalTooLargeException(subtotalPaise);
  }
  return subtotalPaise;
}
