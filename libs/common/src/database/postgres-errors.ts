/** Postgres error code for a broken unique constraint. */
export const POSTGRES_UNIQUE_VIOLATION = '23505';

interface PostgresErrorFields {
  code?: unknown;
  constraint?: unknown;
  driverError?: { code?: unknown; constraint?: unknown };
}

/**
 * True for a Postgres unique-constraint error, optionally only for the named
 * constraint. TypeORM's QueryFailedError copies the driver's `code` and
 * `constraint` onto itself and also keeps them on `driverError`.
 *
 * @example
 * if (isUniqueViolation(error, 'uq_orders_idempotency_key')) { ... }
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const fields = error as Error & PostgresErrorFields;
  const code = fields.code ?? fields.driverError?.code;
  if (code !== POSTGRES_UNIQUE_VIOLATION) {
    return false;
  }
  return (
    constraint === undefined || (fields.constraint ?? fields.driverError?.constraint) === constraint
  );
}
