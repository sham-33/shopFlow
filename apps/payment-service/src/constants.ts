// Fixed values used across the payment-service.

/** Name on every log line. */
export const SERVICE_NAME = 'payment-service';

/** Port used when PORT is not set. */
export const DEFAULT_PORT = 3003;

/** Title and description of the Swagger page at /docs. */
export const API_DOCS = {
  title: 'Payment Service',
  description: 'Charges customers, refunds cancelled orders and creates invoice PDFs.',
};
