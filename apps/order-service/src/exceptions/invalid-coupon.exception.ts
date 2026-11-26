import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';
import type { CouponRejection } from '../domain/coupon-rules.js';

export class InvalidCouponException extends DomainException {
  constructor(couponCode: string, reason: CouponRejection) {
    super(ERRORS.INVALID_COUPON, { details: { couponCode, reason } });
  }
}
