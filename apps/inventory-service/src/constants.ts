// Fixed values used across the inventory service. Error codes live in
// constants/errors.ts.

import { ServiceName } from '@app/contracts';

// Service

/** Name on every log line. */
export const SERVICE_NAME = ServiceName.INVENTORY;

/** Port used when PORT is not set. */
export const DEFAULT_PORT = 3002;

/** Title and description of the Swagger page at /docs. */
export const API_DOCS = {
  title: 'Inventory Service',
  description:
    'Owns the product catalogue and stock levels. Reserves stock for new orders, releases it on cancellation and commits it on payment.',
};

// Database

/** Database used outside production when TYPEORM_DATABASE is not set. */
export const LOCAL_DATABASE = 'inventory_db';

// Products

/** SKU format: upper-case letters, digits and hyphens, not starting with a hyphen. */
export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;
export const SKU_PATTERN_MESSAGE =
  'sku may contain only A-Z, 0-9 and hyphens, and must not start with a hyphen';

/** The largest price a numeric(12,2) column can hold, in rupees. */
export const MAX_PRICE_RUPEES = 9_999_999_999.99;

/** Upper limit for one stock change, to catch typos such as 10000000. */
export const MAX_STOCK_CHANGE = 1_000_000;

/** Swagger description of the `:id` path parameter on product routes. */
export const PRODUCT_ID_PARAM = { name: 'id', description: 'Product ID', format: 'uuid' } as const;

// Messaging

/** Names under which this service records the events it has handled (processed_events). */
export const CONSUMER_NAMES = {
  /** Reserves stock for each OrderCreated. */
  STOCK_RESERVATION: 'inventory-service.stock-reservation',
} as const;
