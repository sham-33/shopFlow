import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

export class DuplicateCouponException extends DomainException {
  constructor(code: string) {
    super(ERRORS.DUPLICATE_COUPON, { details: { code } });
  }
}
