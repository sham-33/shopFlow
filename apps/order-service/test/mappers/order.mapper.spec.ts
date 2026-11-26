import { PaymentMethod } from '../../src/domain/enums.js';
import { PlaceOrderDto } from '../../src/dto/place-order.dto.js';
import { toOrderResponse, toOrderSummary, toPlaceOrder } from '../../src/mappers/order.mapper.js';
import {
  CUSTOMER_ID,
  IDEMPOTENCY_KEY,
  ORDER_ID,
  SHIRT_ID,
  anOrder,
  anOrderItem,
} from '../builders/order.builder.js';

describe('order mapper', () => {
  it('toPlaceOrder copies the request and adds the Idempotency-Key', () => {
    const dto = Object.assign(new PlaceOrderDto(), {
      customerId: CUSTOMER_ID,
      paymentMethod: PaymentMethod.UPI,
      items: [{ productId: SHIRT_ID, quantity: 3 }],
    });

    expect(toPlaceOrder(dto, IDEMPOTENCY_KEY)).toEqual({
      customerId: CUSTOMER_ID,
      paymentMethod: PaymentMethod.UPI,
      items: [{ productId: SHIRT_ID, quantity: 3 }],
      idempotencyKey: IDEMPOTENCY_KEY,
    });
  });

  it('toOrderSummary returns rupees and ISO timestamps', () => {
    const order = anOrder({ subtotalPaise: 119899, discountPaise: 1199, totalPaise: 118700 });

    expect(toOrderSummary(order)).toMatchObject({
      id: ORDER_ID,
      subtotal: 1198.99,
      discount: 11.99,
      total: 1187,
      createdAt: '2026-11-26T10:00:00.000Z',
    });
  });

  it('toOrderResponse works out each line total in paise before converting', () => {
    // 3 × ₹0.10: multiplying rupees would give 0.30000000000000004.
    const order = anOrder({ items: [anOrderItem({ quantity: 3, unitPricePaise: 10 })] });

    expect(toOrderResponse(order).items[0]).toMatchObject({ unitPrice: 0.1, lineTotal: 0.3 });
  });

  it.each([
    ['items', { items: undefined }],
    ['history', { statusHistory: undefined }],
  ])('toOrderResponse fails loudly if the order was loaded without its %s', (_case, missing) => {
    expect(() => toOrderResponse(anOrder(missing))).toThrow(
      `Order ${ORDER_ID} was loaded without its items or history`,
    );
  });
});
