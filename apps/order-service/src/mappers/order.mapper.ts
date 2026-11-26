import { paiseToRupees } from '@app/common';
import type { PlaceOrderDto } from '../dto/place-order.dto.js';
import type {
  OrderLineResponseDto,
  OrderResponseDto,
  OrderSummaryDto,
  StatusChangeDto,
} from '../dto/order-response.dto.js';
import type { OrderItem } from '../entities/order-item.entity.js';
import type { OrderStatusHistory } from '../entities/order-status-history.entity.js';
import type { Order } from '../entities/order.entity.js';
import type { PlaceOrder } from '../services/orders.service.js';

// Converts between the API's shapes (rupees, DTOs) and the service's shapes
// (paise, entities). Nothing else.

export function toPlaceOrder(dto: PlaceOrderDto, idempotencyKey: string): PlaceOrder {
  return {
    customerId: dto.customerId,
    paymentMethod: dto.paymentMethod,
    items: dto.items.map(({ productId, quantity }) => ({ productId, quantity })),
    idempotencyKey,
  };
}

export function toOrderSummary(order: Order): OrderSummaryDto {
  return {
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    subtotal: paiseToRupees(order.subtotalPaise),
    discount: paiseToRupees(order.discountPaise),
    total: paiseToRupees(order.totalPaise),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    couponCode: order.couponCode,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toOrderResponse(order: Order): OrderResponseDto {
  const { items, statusHistory } = order;
  if (!items || !statusHistory) {
    throw new Error(`Order ${order.id} was loaded without its items or history`);
  }
  return {
    ...toOrderSummary(order),
    items: items.map(toOrderLine),
    history: statusHistory.map(toStatusChange),
  };
}

function toOrderLine(item: OrderItem): OrderLineResponseDto {
  return {
    productId: item.productId,
    sku: item.sku,
    name: item.productName,
    quantity: item.quantity,
    unitPrice: paiseToRupees(item.unitPricePaise),
    // Multiplied in paise, then converted: never multiply rupees.
    lineTotal: paiseToRupees(item.quantity * item.unitPricePaise),
  };
}

function toStatusChange(entry: OrderStatusHistory): StatusChangeDto {
  return {
    from: entry.fromStatus,
    to: entry.toStatus,
    reason: entry.reason,
    at: entry.changedAt.toISOString(),
  };
}
