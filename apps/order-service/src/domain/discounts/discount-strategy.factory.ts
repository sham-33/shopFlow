import { CouponType } from '../enums.js';
import type { Coupon } from '../../entities/coupon.entity.js';
import { BuyOneGetOne } from './buy-one-get-one.strategy.js';
import type { DiscountStrategy } from './discount-strategy.js';
import { FlatDiscount } from './flat-discount.strategy.js';
import { NoDiscount } from './no-discount.strategy.js';
import { PercentageDiscount } from './percentage-discount.strategy.js';

/**
 * Picks the discount strategy for a coupon. The map is typed by CouponType,
 * so adding a coupon type without a strategy does not compile.
 */
export class DiscountStrategyFactory {
  private readonly byType: Readonly<Record<CouponType, DiscountStrategy>> = {
    [CouponType.PERCENTAGE]: new PercentageDiscount(),
    [CouponType.FLAT]: new FlatDiscount(),
    [CouponType.BOGO]: new BuyOneGetOne(),
  };

  private readonly noDiscount = new NoDiscount();

  /** The strategy for this coupon, or NoDiscount when there is none. */
  public forCoupon(coupon: Coupon | null): DiscountStrategy {
    return coupon ? this.byType[coupon.type] : this.noDiscount;
  }
}
