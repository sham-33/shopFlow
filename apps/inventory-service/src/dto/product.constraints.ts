// Limits shared by the product DTOs (and, later, the CSV bulk import).
// Strings are trimmed globally by TrimStringsPipe, before validation.

/** Upper-case letters, digits and hyphens, not starting with a hyphen. */
export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;
export const SKU_PATTERN_MESSAGE =
  'sku may contain only A-Z, 0-9 and hyphens, and must not start with a hyphen';

/** The largest amount a numeric(12,2) column can hold. */
export const MAX_PRICE_RUPEES = 9_999_999_999.99;

/** Upper limit for one stock change, to catch typos such as 10000000. */
export const MAX_STOCK_CHANGE = 1_000_000;
