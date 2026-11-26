import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

export class OrderNotFoundException extends DomainException {
  constructor(orderId: string) {
    super(ERRORS.ORDER_NOT_FOUND, { details: { orderId } });
  }
}
