// Fixed values used across the order-service.

/** Name on every log line. */
export const SERVICE_NAME = 'order-service';

/** Port used when PORT is not set. */
export const DEFAULT_PORT = 3001;

/** Title and description of the Swagger page at /docs. */
export const API_DOCS = {
  title: 'Order Service',
  description:
    'Places orders, applies discounts and tracks each order from PENDING to CONFIRMED, CANCELLED or REFUNDED.',
};

// Database

/** Database used outside production when TYPEORM_DATABASE is not set. */
export const LOCAL_DATABASE = 'orders_db';

// Orders

/** Every order is in Indian rupees. */
export const ORDER_CURRENCY = 'INR';

/** Most lines one order may have. */
export const MAX_ITEMS_PER_ORDER = 50;

/** Most units of one product per order. */
export const MAX_QUANTITY_PER_ITEM = 10;

/** The largest amount a numeric(12,2) column can hold, in paise (₹9,999,999,999.99). */
export const MAX_ORDER_AMOUNT_PAISE = 999_999_999_999;

/** Request header that makes POST /orders safe to retry. */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** Letters, digits and `_ . : -`, up to the 100 characters the column holds. */
export const IDEMPOTENCY_KEY_PATTERN = /^[\w.:-]{1,100}$/;

/** Response header set to `true` when POST /orders returned an existing order for a repeated key. */
export const IDEMPOTENT_REPLAYED_HEADER = 'Idempotent-Replayed';

/** Swagger description of the `:id` path parameter on order routes. */
export const ORDER_ID_PARAM = { name: 'id', description: 'Order ID', format: 'uuid' } as const;

/** The `reason` recorded in order_status_history for each kind of change. */
export const STATUS_CHANGE_REASONS = {
  PLACED: 'Order placed',
  CANCELLED_BY_CUSTOMER: 'Cancelled by the customer',
} as const;
