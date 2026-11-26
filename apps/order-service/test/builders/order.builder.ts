import { OrderStatus, PaymentMethod } from '../../src/domain/enums.js';
import { CatalogProduct } from '../../src/entities/catalog-product.entity.js';
import { OrderItem } from '../../src/entities/order-item.entity.js';
import { OrderStatusHistory } from '../../src/entities/order-status-history.entity.js';
import { Order } from '../../src/entities/order.entity.js';

export const ORDER_ID = '0b5a1f9e-3c2d-4e8f-9a7b-6c5d4e3f2a1b';
export const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
export const SHIRT_ID = '33444446-505d-4aaf-b42a-5cbc575a9783';
export const MUG_ID = '44444444-4444-4444-8444-444444444444';
export const IDEMPOTENCY_KEY = 'checkout-5f0c8a2e';

const PLACED_AT = new Date('2026-11-26T10:00:00.000Z');

/** A product in the order service's local catalog: a ₹499.50 red T-shirt by default. */
export function aCatalogProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return Object.assign(new CatalogProduct(), {
    productId: SHIRT_ID,
    sku: 'TSHIRT-RED-M',
    name: 'Red T-shirt (M)',
    pricePaise: 49950,
    active: true,
    updatedAt: PLACED_AT,
    ...overrides,
  });
}

/** One order line: 2 × the red T-shirt by default. */
export function anOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return Object.assign(new OrderItem(), {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    orderId: ORDER_ID,
    productId: SHIRT_ID,
    sku: 'TSHIRT-RED-M',
    productName: 'Red T-shirt (M)',
    quantity: 2,
    unitPricePaise: 49950,
    ...overrides,
  });
}

/** A history entry: the order being placed by default. */
export function aStatusChange(overrides: Partial<OrderStatusHistory> = {}): OrderStatusHistory {
  return Object.assign(new OrderStatusHistory(), {
    id: 'bbbbbbbb-0000-4000-8000-000000000001',
    orderId: ORDER_ID,
    fromStatus: null,
    toStatus: OrderStatus.PENDING,
    reason: 'Order placed',
    changedAt: PLACED_AT,
    ...overrides,
  });
}

/** A PENDING wallet order for 2 red T-shirts (₹999), as the repository returns it. */
export function anOrder(overrides: Partial<Order> = {}): Order {
  return Object.assign(new Order(), {
    id: ORDER_ID,
    customerId: CUSTOMER_ID,
    status: OrderStatus.PENDING,
    subtotalPaise: 99900,
    discountPaise: 0,
    totalPaise: 99900,
    currency: 'INR',
    paymentMethod: PaymentMethod.WALLET,
    couponCode: null,
    cancelReason: null,
    idempotencyKey: IDEMPOTENCY_KEY,
    version: 1,
    createdAt: PLACED_AT,
    updatedAt: PLACED_AT,
    items: [anOrderItem()],
    statusHistory: [aStatusChange()],
    ...overrides,
  });
}
