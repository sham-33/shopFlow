import { percentOfPaise } from '@app/common';
import type { Coupon } from '../../entities/coupon.entity.js';
import type { PricedLine } from '../order-pricing.js';
import type { DiscountStrategy } from './discount-strategy.js';

/** PERCENTAGE coupons: percent_off of the subtotal, rounded to the nearest paisa. */
export class PercentageDiscount implements DiscountStrategy {
  public discountFor(
    subtotalPaise: number,
    _lines: readonly PricedLine[],
    coupon: Coupon | null,
  ): number {
    if (coupon?.percentOff == null) {
      throw new Error(`PERCENTAGE coupon ${coupon?.code ?? '(none)'} has no percent_off`);
    }
    return percentOfPaise(subtotalPaise, coupon.percentOff);
  }
}
