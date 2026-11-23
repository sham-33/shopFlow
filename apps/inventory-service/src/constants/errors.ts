import type { DomainErrorDefinition } from '@app/common';

/**
 * Every error code the inventory service returns, besides COMMON_ERRORS from
 * @app/common. Codes are part of the API: never rename or reuse one.
 */
export const ERRORS = {
  PRODUCT_NOT_FOUND: {
    code: 'PRODUCT_NOT_FOUND',
    kind: 'not_found',
    message: 'Product not found',
  },
  DUPLICATE_SKU: {
    code: 'DUPLICATE_SKU',
    kind: 'conflict',
    message: 'A product with this SKU already exists',
  },
} as const satisfies Record<string, DomainErrorDefinition>;
