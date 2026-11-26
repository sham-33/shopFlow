import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

export class UnknownProductsException extends DomainException {
  constructor(productIds: readonly string[]) {
    super(ERRORS.UNKNOWN_PRODUCTS, { details: { productIds } });
  }
}
