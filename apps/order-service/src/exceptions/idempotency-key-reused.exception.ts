import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

/** The key belongs to an earlier order whose customer, payment method or items differ. */
export class IdempotencyKeyReusedException extends DomainException {
  constructor(idempotencyKey: string, existingOrderId: string) {
    super(ERRORS.IDEMPOTENCY_KEY_REUSED, { details: { idempotencyKey, existingOrderId } });
  }
}
