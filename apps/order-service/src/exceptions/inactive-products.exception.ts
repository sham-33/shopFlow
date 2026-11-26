import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

export class InactiveProductsException extends DomainException {
  constructor(productIds: readonly string[]) {
    super(ERRORS.INACTIVE_PRODUCTS, { details: { productIds } });
  }
}
