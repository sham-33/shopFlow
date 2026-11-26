import { paiseToRupees, rupeesToPaise } from '@app/common';
import type { CouponResponseDto } from '../dto/coupon-response.dto.js';
import type { CreateCouponDto } from '../dto/create-coupon.dto.js';
import type { Coupon } from '../entities/coupon.entity.js';
import type { NewCoupon } from '../services/coupons.service.js';

export function toNewCoupon(dto: CreateCouponDto): NewCoupon {
  return {
    code: dto.code,
    type: dto.type,
    percentOff: dto.percentOff ?? null,
    amountOffPaise: dto.amountOff === undefined ? null : rupeesToPaise(dto.amountOff),
    minOrderPaise: rupeesToPaise(dto.minOrderAmount),
    expiresAt: dto.expiresAt ?? null,
  };
}

export function toCouponResponse(coupon: Coupon): CouponResponseDto {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    percentOff: coupon.percentOff,
    amountOff: coupon.amountOffPaise === null ? null : paiseToRupees(coupon.amountOffPaise),
    minOrderAmount: paiseToRupees(coupon.minOrderPaise),
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
    active: coupon.active,
    createdAt: coupon.createdAt.toISOString(),
  };
}
