import { CouponType } from '../../src/domain/enums.js';
import { CreateCouponDto } from '../../src/dto/create-coupon.dto.js';
import { toCouponResponse, toNewCoupon } from '../../src/mappers/coupon.mapper.js';
import { aCoupon, aFlatCoupon } from '../builders/coupon.builder.js';

describe('coupon mapper', () => {
  it('toNewCoupon turns rupees into paise and fills absent fields with null', () => {
    const dto = Object.assign(new CreateCouponDto(), {
      code: 'FLAT100',
      type: CouponType.FLAT,
      amountOff: 100.5,
      minOrderAmount: 499.99,
    });

    expect(toNewCoupon(dto)).toEqual({
      code: 'FLAT100',
      type: CouponType.FLAT,
      percentOff: null,
      amountOffPaise: 10050,
      minOrderPaise: 49999,
      expiresAt: null,
    });
  });

  it('toNewCoupon keeps the percentage and the expiry', () => {
    const expiresAt = new Date('2026-12-31T23:59:59.000Z');
    const dto = Object.assign(new CreateCouponDto(), {
      code: 'SAVE10',
      type: CouponType.PERCENTAGE,
      percentOff: 10,
      minOrderAmount: 0,
      expiresAt,
    });

    expect(toNewCoupon(dto)).toMatchObject({ percentOff: 10, amountOffPaise: null, expiresAt });
  });

  it('toCouponResponse returns rupees and ISO dates', () => {
    const coupon = aFlatCoupon(10050, {
      minOrderPaise: 49999,
      expiresAt: new Date('2026-12-31T23:59:59.000Z'),
    });

    expect(toCouponResponse(coupon)).toEqual({
      id: coupon.id,
      code: 'FLAT100',
      type: CouponType.FLAT,
      percentOff: null,
      amountOff: 100.5,
      minOrderAmount: 499.99,
      expiresAt: '2026-12-31T23:59:59.000Z',
      active: true,
      createdAt: '2026-11-26T10:00:00.000Z',
    });
  });

  it('toCouponResponse leaves expiresAt null for a coupon that never expires', () => {
    expect(toCouponResponse(aCoupon()).expiresAt).toBeNull();
  });
});
