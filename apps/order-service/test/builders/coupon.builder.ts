import { CouponType } from '../../src/domain/enums.js';
import { Coupon } from '../../src/entities/coupon.entity.js';

/** An active, never-expiring 10% coupon by default. */
export function aCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return Object.assign(new Coupon(), {
    id: 'c0c0c0c0-0000-4000-8000-000000000001',
    code: 'SAVE10',
    type: CouponType.PERCENTAGE,
    percentOff: 10,
    amountOffPaise: null,
    minOrderPaise: 0,
    expiresAt: null,
    active: true,
    createdAt: new Date('2026-11-26T10:00:00.000Z'),
    ...overrides,
  });
}

export const aFlatCoupon = (amountOffPaise: number, overrides: Partial<Coupon> = {}): Coupon =>
  aCoupon({
    code: 'FLAT100',
    type: CouponType.FLAT,
    percentOff: null,
    amountOffPaise,
    ...overrides,
  });

export const aBogoCoupon = (overrides: Partial<Coupon> = {}): Coupon =>
  aCoupon({ code: 'BOGO', type: CouponType.BOGO, percentOff: null, ...overrides });
