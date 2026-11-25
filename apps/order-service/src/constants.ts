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
