import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

export class OrderTotalTooLargeException extends DomainException {
  constructor(subtotalPaise: number) {
    super(ERRORS.ORDER_TOTAL_TOO_LARGE, { details: { subtotalPaise } });
  }
}
