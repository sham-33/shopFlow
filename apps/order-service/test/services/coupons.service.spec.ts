import type { Mocked } from 'vitest';
import { CouponType } from '../../src/domain/enums.js';
import { DuplicateCouponException } from '../../src/exceptions/duplicate-coupon.exception.js';
import type { CouponRepository } from '../../src/repository/coupon.repository.js';
import { CouponsService, type NewCoupon } from '../../src/services/coupons.service.js';

const NEW_COUPON: NewCoupon = {
  code: 'SAVE10',
  type: CouponType.PERCENTAGE,
  percentOff: 10,
  amountOffPaise: null,
  minOrderPaise: 0,
  expiresAt: null,
};

describe('CouponsService', () => {
  let coupons: Mocked<CouponRepository>;
  let service: CouponsService;

  beforeEach(() => {
    coupons = {
      findByCode: vi.fn<CouponRepository['findByCode']>(),
      insert: vi.fn<CouponRepository['insert']>((coupon) => Promise.resolve(coupon)),
    };
    service = new CouponsService(coupons);
  });

  it('saves the coupon as active', async () => {
    const created = await service.create(NEW_COUPON);

    expect(created).toMatchObject({ ...NEW_COUPON, active: true });
    expect(coupons.insert).toHaveBeenCalledWith(created);
  });

  it('throws DUPLICATE_COUPON, naming the code, when the code is taken', async () => {
    coupons.insert.mockResolvedValue(null);

    const created = service.create(NEW_COUPON);

    await expect(created).rejects.toBeInstanceOf(DuplicateCouponException);
    await expect(created).rejects.toMatchObject({
      code: 'DUPLICATE_COUPON',
      details: { code: 'SAVE10' },
    });
  });
});
