import type { DiscountStrategy } from './discount-strategy.js';

/** An order without a coupon. */
export class NoDiscount implements DiscountStrategy {
  public discountFor(): number {
    return 0;
  }
}
