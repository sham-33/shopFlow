// Money is stored in Postgres as numeric(12,2) rupees and handled in code as
// whole paise (₹1 = 100 paise), so totals never go through floating-point math.
// Conversions here work on the digits of the string, never on 499.5 * 100.

const DECIMAL_AMOUNT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** "499.50", "499.5" or "499" → 49950, 49950, 49900 paise. */
export function decimalToPaise(amount: string): number {
  const match = DECIMAL_AMOUNT.exec(amount);
  if (!match) {
    throw new TypeError(`Not a money amount with at most 2 decimals: "${amount}"`);
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
 * 499.5 rupees (a JSON number from an API request) → 49950 paise.
 * Rejects numbers with more than 2 decimals instead of rounding them.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new RangeError(`Not a money amount: ${rupees}`);
  }
  // String(19.99) is "19.99", the shortest exact form of the number, so we
  // convert digits, never 19.99 * 100. Exponent forms such as "1e+21" are
  // rejected by decimalToPaise.
  return decimalToPaise(String(rupees));
}

/**
 * 49950 paise → 499.5 rupees, for API responses. Dividing a whole number by
 * 100 gives the closest double, which JSON prints exactly ("19.99").
 */
export function paiseToRupees(paise: number): number {
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`Paise must be a whole number, got ${paise}`);
  }
  return paise / 100;
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
    return value === null || value === undefined ? value : paiseToDecimal(value);
  },
  from(value: string | null): number | null {
    return value === null ? null : decimalToPaise(value);
  },
};

/**
 * `percent`% of an amount in paise, rounded to the nearest paisa (half a
 * paisa rounds up). Integer arithmetic only: 12.5% of 199 paise is 25, never
 * 24.874999….
 */
export function percentOfPaise(paise: number, percent: number): number {
  if (!Number.isSafeInteger(paise) || paise < 0) {
    throw new RangeError(`Paise must be a whole number of at least 0, got ${paise}`);
  }
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`Percent must be a whole number from 0 to 100, got ${percent}`);
  }
  const hundredths = paise * percent;
  const remainder = hundredths % 100;
  return (hundredths - remainder) / 100 + (remainder >= 50 ? 1 : 0);
}
