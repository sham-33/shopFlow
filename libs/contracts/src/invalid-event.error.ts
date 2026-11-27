import type { FieldError } from '@app/common';

/**
 * A message that does not match its contract. Retrying can never fix it, so a
 * consumer sends it straight to its dead-letter topic; a producer has a bug.
 */
export class InvalidEventError extends Error {
  public override readonly name = 'InvalidEventError';

  constructor(
    message: string,
    /** The fields that broke a rule, with paths such as `payload.items.0.quantity`. */
    public readonly problems: readonly FieldError[] = [],
  ) {
    super(message);
  }
}
