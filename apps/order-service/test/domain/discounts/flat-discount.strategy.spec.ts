import { FlatDiscount } from '../../../src/domain/discounts/flat-discount.strategy.js';
import { aCoupon, aFlatCoupon } from '../../builders/coupon.builder.js';

describe('FlatDiscount', () => {
  const strategy = new FlatDiscount();

  it('takes the fixed amount off', () => {
    expect(strategy.discountFor(99900, [], aFlatCoupon(10000))).toBe(10000);
  });

  it('takes the whole subtotal when the amount is exactly the subtotal', () => {
    expect(strategy.discountFor(10000, [], aFlatCoupon(10000))).toBe(10000);
  });

  it('never takes more than the subtotal, so the total is 0, not negative', () => {
    expect(strategy.discountFor(4999, [], aFlatCoupon(10000))).toBe(4999);
  });

  it('fails loudly for a coupon without an amount', () => {
    expect(() => strategy.discountFor(1000, [], aCoupon({ code: 'BROKEN' }))).toThrow(
      'FLAT coupon BROKEN has no amount_off',
    );
    expect(() => strategy.discountFor(1000, [], null)).toThrow(
      'FLAT coupon (none) has no amount_off',
    );
  });
});
