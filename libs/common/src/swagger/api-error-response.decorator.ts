import type { HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { STATUS_CODES } from 'node:http';
import type { ErrorDefinition } from '../exceptions/domain.exception.js';
import { ErrorResponseDto } from './error-response.dto.js';

// Sample `details` for codes whose details have a fixed shape.
const EXAMPLE_DETAILS: Record<string, Record<string, unknown>> = {
  VALIDATION_FAILED: {
    fields: [{ field: 'price', messages: ['price must not be less than 0'] }],
  },
  INVALID_ID: { parameter: 'id' },
};

/**
 * Documents one error status, listing every catalog code the endpoint can
 * return for it, with an example body per code. One decorator per status:
 *
 * @example
 * @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.INVALID_ID, COMMON_ERRORS.VALIDATION_FAILED)
 * @ApiErrorResponse(HttpStatus.NOT_FOUND, ERRORS.PRODUCT_NOT_FOUND)
 */
export function ApiErrorResponse(
  status: HttpStatus,
  ...errors: [ErrorDefinition, ...ErrorDefinition[]]
): MethodDecorator & ClassDecorator {
  const statusText = STATUS_CODES[status] ?? 'Error';
  return ApiResponse({
    status,
    description: errors.map(({ code, message }) => `\`${code}\`: ${message}`).join('<br>'),
    type: ErrorResponseDto,
    examples: Object.fromEntries(
      errors.map(({ code, message }) => [
        code,
        {
          summary: code,
          value: {
            statusCode: status,
            code,
            error: statusText,
            message,
            details: EXAMPLE_DETAILS[code],
            path: '/api/v1/...',
            timestamp: '2026-11-23T11:35:57.258Z',
            correlationId: 'c-91ab',
          },
        },
      ]),
    ),
  });
}
