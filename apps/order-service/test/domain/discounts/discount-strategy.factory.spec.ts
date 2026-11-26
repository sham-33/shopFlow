import { BuyOneGetOne } from '../../../src/domain/discounts/buy-one-get-one.strategy.js';
import { DiscountStrategyFactory } from '../../../src/domain/discounts/discount-strategy.factory.js';
import { FlatDiscount } from '../../../src/domain/discounts/flat-discount.strategy.js';
import { NoDiscount } from '../../../src/domain/discounts/no-discount.strategy.js';
import { PercentageDiscount } from '../../../src/domain/discounts/percentage-discount.strategy.js';
import { CouponType } from '../../../src/domain/enums.js';
import { aBogoCoupon, aCoupon, aFlatCoupon } from '../../builders/coupon.builder.js';

describe('DiscountStrategyFactory', () => {
  const factory = new DiscountStrategyFactory();

  it.each([
    ['PERCENTAGE', aCoupon(), PercentageDiscount],
    ['FLAT', aFlatCoupon(10000), FlatDiscount],
    ['BOGO', aBogoCoupon(), BuyOneGetOne],
  ] as const)('picks the right strategy for a %s coupon', (_type, coupon, Strategy) => {
    expect(factory.forCoupon(coupon)).toBeInstanceOf(Strategy);
  });

  it('picks NoDiscount when the order has no coupon', () => {
    expect(factory.forCoupon(null)).toBeInstanceOf(NoDiscount);
  });

  it('has a strategy for every coupon type', () => {
    for (const type of Object.values(CouponType)) {
      expect(factory.forCoupon(aCoupon({ type }))).toBeDefined();
    }
  });
});
