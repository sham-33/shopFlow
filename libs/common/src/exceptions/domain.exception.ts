/**
 * What kind of failure a domain error is. Domain code stays free of HTTP;
 * `AllExceptionsFilter` maps each kind to a status code.
 */
export type DomainErrorKind =
  'invalid_input' | 'not_found' | 'conflict' | 'unprocessable';

export interface DomainExceptionOptions {
  /** Stable, machine-readable code, for example `INVALID_ORDER_STATE`. */
  code: string;
  kind: DomainErrorKind;
  message: string;
  /** Extra data for the client, such as field errors. Must be safe to show. */
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * Base class for every expected business error, for example
 * `ProductNotFoundException` or `InvalidOrderStateException`.
 *
 * @example
 * export class ProductNotFoundException extends DomainException {
 *   constructor(productId: string) {
 *     super({
 *       code: 'PRODUCT_NOT_FOUND',
 *       kind: 'not_found',
 *       message: `Product ${productId} was not found`,
 *     });
 *   }
 * }
 */
export abstract class DomainException extends Error {
  readonly code: string;
  readonly kind: DomainErrorKind;
  readonly details?: Record<string, unknown>;

  protected constructor({
    code,
    kind,
    message,
    details,
    cause,
  }: DomainExceptionOptions) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    this.code = code;
    this.kind = kind;
    this.details = details;
  }
}
