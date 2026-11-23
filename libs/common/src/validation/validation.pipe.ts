import { ValidationPipe, type ValidationError } from '@nestjs/common';
import {
  type FieldError,
  RequestValidationException,
} from '../exceptions/request-validation.exception.js';

/**
 * The ValidationPipe used by every service:
 * - `whitelist` drops fields that have no validation decorator,
 * - `forbidNonWhitelisted` rejects the request instead, with a 400,
 * - `transform` turns plain JSON and query strings into DTO class instances.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new RequestValidationException(flattenValidationErrors(errors)),
  });
}

/**
 * Turns class-validator's nested error tree into a flat list, one entry per
 * field, with paths such as `items.0.quantity`.
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}
