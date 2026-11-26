import type { DomainErrorDefinition } from '@app/common';

/**
 * Every error code the order service returns, besides COMMON_ERRORS from
 * @app/common. Codes are part of the API: never rename or reuse one.
 */
export const ERRORS = {
  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND',
    kind: 'not_found',
    message: 'Order not found',
  },
  INVALID_ORDER_STATE: {
    code: 'INVALID_ORDER_STATE',
    kind: 'conflict',
    message: 'Order cannot move to the requested status',
  },
  ORDER_CHANGED_CONCURRENTLY: {
    code: 'ORDER_CHANGED_CONCURRENTLY',
    kind: 'conflict',
    message: 'The order changed while this request was running; read it again and retry',
  },
  IDEMPOTENCY_KEY_REUSED: {
    code: 'IDEMPOTENCY_KEY_REUSED',
    kind: 'conflict',
    message: 'This Idempotency-Key was already used for a different order',
  },
  UNKNOWN_PRODUCTS: {
    code: 'UNKNOWN_PRODUCTS',
    kind: 'unprocessable',
    message: 'Some products do not exist',
  },
  INACTIVE_PRODUCTS: {
    code: 'INACTIVE_PRODUCTS',
    kind: 'unprocessable',
    message: 'Some products can no longer be ordered',
  },
  ORDER_TOTAL_TOO_LARGE: {
    code: 'ORDER_TOTAL_TOO_LARGE',
    kind: 'unprocessable',
    message: 'The order total is larger than the system can store',
  },
} as const satisfies Record<string, DomainErrorDefinition>;
