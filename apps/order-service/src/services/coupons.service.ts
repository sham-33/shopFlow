import { Inject, Injectable } from '@nestjs/common';
import type { CouponType } from '../domain/enums.js';
import { Coupon } from '../entities/coupon.entity.js';
import { DuplicateCouponException } from '../exceptions/duplicate-coupon.exception.js';
import { COUPON_REPOSITORY, type CouponRepository } from '../repository/coupon.repository.js';

/** Everything needed to create a coupon. The DTO has already checked that each type has its own field. */
export interface NewCoupon {
  /** Upper case. */
  code: string;
  type: CouponType;
  percentOff: number | null;
  amountOffPaise: number | null;
  minOrderPaise: number;
  expiresAt: Date | null;
}

@Injectable()
export class CouponsService {
  constructor(@Inject(COUPON_REPOSITORY) private readonly coupons: CouponRepository) {}

  /** Creates an active coupon. A code already in use fails with 409 DUPLICATE_COUPON. */
  public async create(newCoupon: NewCoupon): Promise<Coupon> {
    const saved = await this.coupons.insert(
      Object.assign(new Coupon(), { ...newCoupon, active: true }),
    );
    if (!saved) {
      throw new DuplicateCouponException(newCoupon.code);
    }
    return saved;
  }
}
