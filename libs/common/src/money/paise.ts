// Money is stored in Postgres as numeric(12,2) rupees and handled in code as
// whole paise (₹1 = 100 paise), so totals never go through floating-point math.
// Conversions here work on the digits of the string, never on 499.5 * 100.

const DECIMAL_AMOUNT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** "499.50", "499.5" or "499" → 49950, 49950, 49900 paise. */
export function decimalToPaise(amount: string): number {
  const match = DECIMAL_AMOUNT.exec(amount);
  if (!match) {
    throw new TypeError(
      `Not a money amount with at most 2 decimals: "${amount}"`,
    );
  }
  const [, sign = '', rupees = '0', fraction = ''] = match;
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`Money amount is too large: "${amount}"`);
  }
  return sign === '-' && paise !== 0 ? -paise : paise;
}

/** 49950 paise → "499.50". */
export function paiseToDecimal(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`Paise must be a whole number, got ${paise}`);
  }
  const abs = Math.abs(paise);
  const rupees = (abs - (abs % 100)) / 100;
  const rest = String(abs % 100).padStart(2, '0');
  return `${paise < 0 ? '-' : ''}${rupees}.${rest}`;
}

/**
 * TypeORM column transformer for a numeric(…, 2) money column: the database
 * holds rupees as a decimal string, the entity property holds whole paise.
 *
 * @example
 * @Column({ name: 'price', type: 'numeric', precision: 12, scale: 2, transformer: paiseTransformer })
 * pricePaise: number;
 */
export const paiseTransformer = {
  to(value: number | null | undefined): string | null | undefined {
    return value === null || value === undefined
      ? value
      : paiseToDecimal(value);
  },
  from(value: string | null): number | null {
    return value === null ? null : decimalToPaise(value);
  },
};
