import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';

export class DuplicateSkuException extends DomainException {
  constructor(sku: string) {
    super(ERRORS.DUPLICATE_SKU, { details: { sku } });
  }
}
