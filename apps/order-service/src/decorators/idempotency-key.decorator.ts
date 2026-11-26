import { RequestValidationException } from '@app/common';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { IDEMPOTENCY_KEY_HEADER, IDEMPOTENCY_KEY_PATTERN } from '../constants.js';

/**
 * Returns a valid Idempotency-Key header value, or fails with 400
 * VALIDATION_FAILED naming the header, like any other invalid input.
 */
export function parseIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new RequestValidationException([
      {
        field: IDEMPOTENCY_KEY_HEADER,
        messages: [
          `${IDEMPOTENCY_KEY_HEADER} header is required: up to 100 letters, digits, _ . : or -`,
        ],
      },
    ]);
  }
  return value;
}

/**
 * The request's Idempotency-Key header, validated. Nest's @Headers() cannot
 * take a pipe, so this decorator reads and checks the header itself.
 *
 * @example
 * public place(@Body() dto: PlaceOrderDto, @IdempotencyKey() key: string)
 */
export const IdempotencyKey = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  parseIdempotencyKey(
    context.switchToHttp().getRequest<Request>().headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()],
  ),
);
