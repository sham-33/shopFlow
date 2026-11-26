/** class-transformer helper: coupon codes are stored and matched in upper case. */
export const toUpperCase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.toUpperCase() : value;
