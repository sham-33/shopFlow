// Fixed values of the event contracts.

/** The largest amount a numeric(12,2) column holds, in rupees. Every service stores money that way. */
export const MAX_AMOUNT_RUPEES = 9_999_999_999.99;

/** Longest SKU the services store (varchar(64)). */
export const SKU_MAX_LENGTH = 64;

/** Longest product name the services store (varchar(200)). */
export const PRODUCT_NAME_MAX_LENGTH = 200;

/** A machine-readable reason, such as INSUFFICIENT_BALANCE. */
export const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
export const REASON_CODE_PATTERN_MESSAGE =
  '$property must be an upper-case code of at most 64 letters, digits and underscores, such as INSUFFICIENT_BALANCE';
