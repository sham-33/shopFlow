import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

export class ProductNotFoundException extends DomainException {
  constructor(productId: string) {
    super(ERRORS.PRODUCT_NOT_FOUND, { details: { productId } });
  }
}
