import type { Coupon } from '../../entities/coupon.entity.js';
import type { PricedLine } from '../order-pricing.js';
import type { DiscountStrategy } from './discount-strategy.js';

/** FLAT coupons: amount_off, but never more than the subtotal, so the total never goes below 0. */
export class FlatDiscount implements DiscountStrategy {
  public discountFor(
    subtotalPaise: number,
    _lines: readonly PricedLine[],
    coupon: Coupon | null,
  ): number {
    if (coupon?.amountOffPaise == null) {
      throw new Error(`FLAT coupon ${coupon?.code ?? '(none)'} has no amount_off`);
    }
    return Math.min(coupon.amountOffPaise, subtotalPaise);
  }
}
