import type { Coupon } from '../entities/coupon.entity.js';

/**
 * Why a coupon cannot be used, sent to the client as `details.reason` of
 * INVALID_COUPON. Part of the API: never rename a value.
 */
export enum CouponRejection {
  NOT_FOUND = 'NOT_FOUND',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  MIN_ORDER_NOT_MET = 'MIN_ORDER_NOT_MET',
}

/**
 * Why `coupon` cannot be used for an order with this subtotal at `now`, or
 * null when it can. The minimum is checked against the subtotal before any
 * discount.
 */
export function couponRejection(
  coupon: Coupon,
  subtotalPaise: number,
  now: Date,
): CouponRejection | null {
  if (!coupon.active) {
    return CouponRejection.INACTIVE;
  }
  if (coupon.expiresAt !== null && coupon.expiresAt.getTime() <= now.getTime()) {
    return CouponRejection.EXPIRED;
  }
  if (subtotalPaise < coupon.minOrderPaise) {
    return CouponRejection.MIN_ORDER_NOT_MET;
  }
  return null;
}
