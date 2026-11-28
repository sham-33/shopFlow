import { paiseToRupees } from '@app/common';
import type { OrderCreatedPayload, OrderPaymentRequestedPayload } from '@app/contracts';
import type { Order } from '../entities/order.entity.js';

// Converts orders into event payloads: money in rupees, only what other
// services need.

/** What the inventory service reserves and the payment service later charges. */
export function toOrderCreatedPayload(order: Order): OrderCreatedPayload {
  if (!order.items) {
    throw new Error(`Order ${order.id} has no items loaded`);
  }
  return {
    orderId: order.id,
    customerId: order.customerId,
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: paiseToRupees(item.unitPricePaise),
    })),
    totalAmount: paiseToRupees(order.totalPaise),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
  };
}

/** What the payment service charges once the stock is reserved. */
export function toOrderPaymentRequestedPayload(order: Order): OrderPaymentRequestedPayload {
  return {
    orderId: order.id,
    customerId: order.customerId,
    amount: paiseToRupees(order.totalPaise),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
  };
}
