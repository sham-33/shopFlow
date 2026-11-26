import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

/** The order's version changed between reading it and saving it: someone else updated it first. */
export class OrderChangedConcurrentlyException extends DomainException {
  constructor(orderId: string) {
    super(ERRORS.ORDER_CHANGED_CONCURRENTLY, { details: { orderId } });
  }
}
