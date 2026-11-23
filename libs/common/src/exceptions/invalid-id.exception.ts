import { COMMON_ERRORS } from './common-errors.js';
import { DomainException } from './domain.exception.js';

/** Thrown by ParseIdPipe when a path parameter is not a UUID. */
export class InvalidIdException extends DomainException {
  constructor(parameter: string) {
    super(COMMON_ERRORS.INVALID_ID, { details: { parameter } });
  }
}
