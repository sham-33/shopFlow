import { CancelReason, PaymentMethod } from '../../src/domain/enums.js';
import { toOrderCreatedPayload } from '../../src/mappers/order-event.mapper.js';
import {
  CUSTOMER_ID,
  MUG_ID,
  ORDER_ID,
  SHIRT_ID,
  anOrder,
  anOrderItem,
} from '../builders/order.builder.js';

describe('toOrderCreatedPayload', () => {
  it('describes the order with its money in rupees', () => {
    const order = anOrder({
      subtotalPaise: 119899,
      discountPaise: 11990,
      totalPaise: 107909,
      paymentMethod: PaymentMethod.UPI,
      items: [
        anOrderItem({
          productId: SHIRT_ID,
          quantity: 2,
          unitPricePaise: 49950,
        }),
        anOrderItem({ productId: MUG_ID, quantity: 1, unitPricePaise: 19999 }),
      ],
    });

    expect(toOrderCreatedPayload(order)).toEqual({
      orderId: ORDER_ID,
      customerId: CUSTOMER_ID,
      items: [
        { productId: SHIRT_ID, quantity: 2, unitPrice: 499.5 },
        { productId: MUG_ID, quantity: 1, unitPrice: 199.99 },
      ],
      totalAmount: 1079.09,
      currency: 'INR',
      paymentMethod: PaymentMethod.UPI,
    });
  });

  it('carries a free order (a 100% coupon) as 0 rupees', () => {
    const order = anOrder({ discountPaise: 99900, totalPaise: 0 });

    expect(toOrderCreatedPayload(order).totalAmount).toBe(0);
  });

  it('leaves out what other services do not need: SKU, names, coupon and history', () => {
    const order = anOrder({
      couponCode: 'DIWALI10',
      cancelReason: CancelReason.CUSTOMER_REQUEST,
    });

    const payload = toOrderCreatedPayload(order);

    expect(Object.keys(payload).sort()).toEqual([
      'currency',
      'customerId',
      'items',
      'orderId',
      'paymentMethod',
      'totalAmount',
    ]);
    expect(Object.keys(payload.items[0] ?? {}).sort()).toEqual([
      'productId',
      'quantity',
      'unitPrice',
    ]);
  });

  it('refuses an order loaded without its items, instead of announcing an empty order', () => {
    const order = anOrder({ items: undefined });

    expect(() => toOrderCreatedPayload(order)).toThrow(`Order ${ORDER_ID} has no items loaded`);
  });
});
