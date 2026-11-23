import type { DomainErrorDefinition, ErrorDefinition } from './domain.exception.js';

/**
 * Error codes any service can return. Each service lists its own codes in
 * `src/constants/errors.ts`.
 *
 * Codes are part of the API: never rename or reuse one.
 */
export const COMMON_ERRORS = {
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    kind: 'invalid_input',
    message: 'Request validation failed',
  },
  INVALID_ID: {
    code: 'INVALID_ID',
    kind: 'invalid_input',
    message: 'The ID must be a valid UUID',
  },
  UNIQUE_VIOLATION: {
    code: 'UNIQUE_VIOLATION',
    message: 'A record with the same unique value already exists',
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service Unavailable',
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  },
} as const satisfies Record<string, ErrorDefinition | DomainErrorDefinition>;
