// Only identifiers and enum values written in our own code are allowed here,
// never user input: the pattern rejects anything that could break out of the
// SQL string.
const SAFE_VALUE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Builds a CHECK expression that limits a varchar column to the values of a
 * TypeScript enum: `"status" IN ('PENDING', 'CONFIRMED')`.
 *
 * @example
 * @Check('chk_orders_status', sqlIn('status', Object.values(OrderStatus)))
 */
export function sqlIn(column: string, values: readonly string[]): string {
  if (values.length === 0) {
    throw new Error(`sqlIn needs at least one value for "${column}"`);
  }
  for (const value of values) {
    if (!SAFE_VALUE.test(value)) {
      throw new Error(`Unsafe value for a CHECK constraint on "${column}": ${value}`);
    }
  }
  return `"${column}" IN (${values.map((value) => `'${value}'`).join(', ')})`;
}
