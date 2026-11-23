/**
 * What kind of failure a domain error is. Domain code stays free of HTTP;
 * `AllExceptionsFilter` maps each kind to a status code.
 */
export type DomainErrorKind = 'invalid_input' | 'not_found' | 'conflict' | 'unprocessable';

/** One entry of an error catalog: a stable code clients rely on, and its message. */
export interface ErrorDefinition {
  code: string;
  message: string;
}

/** A catalog entry for an expected business error. `kind` decides the HTTP status. */
export interface DomainErrorDefinition extends ErrorDefinition {
  kind: DomainErrorKind;
}

export interface DomainExceptionOptions {
  /**
   * Values that explain this occurrence, for example `{ productId }`. Sent to
   * the client, so they must be safe to show.
   */
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * Base class for every expected business error. The code, kind and message
 * come from the service's error catalog (`src/constants/errors.ts`), so every
 * code a client can receive is listed in one place.
 *
 * @example
 * export class ProductNotFoundException extends DomainException {
 *   constructor(productId: string) {
 *     super(ERRORS.PRODUCT_NOT_FOUND, { details: { productId } });
 *   }
 * }
 */
export abstract class DomainException extends Error {
  public readonly code: string;
  public readonly kind: DomainErrorKind;
  public readonly details?: Record<string, unknown>;

  protected constructor(
    definition: DomainErrorDefinition,
    { details, cause }: DomainExceptionOptions = {},
  ) {
    super(definition.message, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    this.code = definition.code;
    this.kind = definition.kind;
    this.details = details;
  }
}
