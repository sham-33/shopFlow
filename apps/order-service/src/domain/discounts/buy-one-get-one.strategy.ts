import type { PricedLine } from '../order-pricing.js';
import type { DiscountStrategy } from './discount-strategy.js';

/**
 * BOGO coupons: on every line, every second unit is free. 2 units → 1 free,
 * 3 units → 1 free, 4 units → 2 free. Different products never pair up.
 */
export class BuyOneGetOne implements DiscountStrategy {
  public discountFor(_subtotalPaise: number, lines: readonly PricedLine[]): number {
    return lines.reduce(
      (discount, { quantity, unitPricePaise }) =>
        discount + Math.floor(quantity / 2) * unitPricePaise,
      0,
    );
  }
}
