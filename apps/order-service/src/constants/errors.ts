import type { DomainErrorDefinition } from '@app/common';

/**
 * Every error code the order service returns, besides COMMON_ERRORS from
 * @app/common. Codes are part of the API: never rename or reuse one.
 */
export const ERRORS = {
  INVALID_ORDER_STATE: {
    code: 'INVALID_ORDER_STATE',
    kind: 'conflict',
    message: 'Order cannot move to the requested status',
  },
} as const satisfies Record<string, DomainErrorDefinition>;
