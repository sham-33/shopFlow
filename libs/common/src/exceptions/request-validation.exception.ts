import { COMMON_ERRORS } from './common-errors.js';
import { DomainException } from './domain.exception.js';

export interface FieldError {
  /** Path to the field, for example `items.0.quantity`. */
  field: string;
  messages: string[];
}

/** Thrown by the global ValidationPipe when a request body or query is invalid. */
export class RequestValidationException extends DomainException {
  constructor(fieldErrors: FieldError[]) {
    super(COMMON_ERRORS.VALIDATION_FAILED, {
      details: { fields: fieldErrors },
    });
  }
}
