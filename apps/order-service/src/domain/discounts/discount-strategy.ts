import type { Coupon } from '../../entities/coupon.entity.js';
import type { PricedLine } from '../order-pricing.js';

/**
 * Works out an order's discount for one kind of coupon (Strategy pattern).
 * DiscountStrategyFactory picks the strategy from the coupon type, so adding
 * a coupon type means adding one class, never editing the others.
 */
export interface DiscountStrategy {
  /**
   * The discount in whole paise, from 0 up to `subtotalPaise`: the total is
   * never negative. `coupon` is null only for NoDiscount.
   */
  discountFor(subtotalPaise: number, lines: readonly PricedLine[], coupon: Coupon | null): number;
}
