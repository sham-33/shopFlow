import { couponRejection, CouponRejection } from '../../src/domain/coupon-rules.js';
import { aCoupon } from '../builders/coupon.builder.js';

const NOW = new Date('2026-11-26T12:00:00.000Z');

describe('couponRejection', () => {
  it('accepts an active coupon with no expiry and no minimum', () => {
    expect(couponRejection(aCoupon(), 1, NOW)).toBeNull();
  });

  it('rejects an inactive coupon', () => {
    expect(couponRejection(aCoupon({ active: false }), 99900, NOW)).toBe(CouponRejection.INACTIVE);
  });

  it.each([
    ['a second ago', new Date('2026-11-26T11:59:59.000Z'), CouponRejection.EXPIRED],
    ['exactly now', NOW, CouponRejection.EXPIRED],
    ['in a second', new Date('2026-11-26T12:00:01.000Z'), null],
  ])('treats a coupon that expires %s as %s', (_case, expiresAt, expected) => {
    expect(couponRejection(aCoupon({ expiresAt }), 99900, NOW)).toBe(expected);
  });

  it.each([
    [49999, CouponRejection.MIN_ORDER_NOT_MET],
    [50000, null],
    [50001, null],
  ])('with a ₹500 minimum, a subtotal of %i paise → %s', (subtotal, expected) => {
    expect(couponRejection(aCoupon({ minOrderPaise: 50000 }), subtotal, NOW)).toBe(expected);
  });

  it('reports inactive before expired, and expired before the minimum', () => {
    const everythingWrong = aCoupon({
      active: false,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      minOrderPaise: 1_000_000,
    });

    expect(couponRejection(everythingWrong, 1, NOW)).toBe(CouponRejection.INACTIVE);
    expect(couponRejection(aCoupon({ ...everythingWrong, active: true }), 1, NOW)).toBe(
      CouponRejection.EXPIRED,
    );
  });
});
