// Values that travel inside events. Never rename a value: messages already in
// Kafka, and rows in every service's database, contain it.

/** The three services. Also each one's Kafka consumer group and the `producer` of its events. */
export enum ServiceName {
  ORDER = 'order-service',
  INVENTORY = 'inventory-service',
  PAYMENT = 'payment-service',
}

/** Every event the services exchange (docs/plan.md, section 4.6). The value is the envelope's `eventType`. */
export enum EventType {
  ORDER_CREATED = 'OrderCreated',
  ORDER_PAYMENT_REQUESTED = 'OrderPaymentRequested',
  ORDER_CONFIRMED = 'OrderConfirmed',
  ORDER_CANCELLED = 'OrderCancelled',
  STOCK_RESERVED = 'StockReserved',
  STOCK_RESERVATION_FAILED = 'StockReservationFailed',
  STOCK_RELEASED = 'StockReleased',
  PAYMENT_COMPLETED = 'PaymentCompleted',
  PAYMENT_FAILED = 'PaymentFailed',
  PAYMENT_REFUNDED = 'PaymentRefunded',
  PRODUCT_UPDATED = 'ProductUpdated',
}

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
  UPI = 'UPI',
}

/** Why an order was cancelled. */
export enum CancelReason {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}
