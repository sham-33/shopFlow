import type { Mocked } from 'vitest';
import { CancelReason, OrderStatus, PaymentMethod } from '../../src/domain/enums.js';
import { OrderStateMachine } from '../../src/domain/order-state-machine.js';
import { IdempotencyKeyReusedException } from '../../src/exceptions/idempotency-key-reused.exception.js';
import { InactiveProductsException } from '../../src/exceptions/inactive-products.exception.js';
import { InvalidOrderStateException } from '../../src/exceptions/invalid-order-state.exception.js';
import { OrderChangedConcurrentlyException } from '../../src/exceptions/order-changed-concurrently.exception.js';
import { OrderNotFoundException } from '../../src/exceptions/order-not-found.exception.js';
import { OrderTotalTooLargeException } from '../../src/exceptions/order-total-too-large.exception.js';
import { UnknownProductsException } from '../../src/exceptions/unknown-products.exception.js';
import type { CatalogRepository } from '../../src/repository/catalog.repository.js';
import type { OrderRepository } from '../../src/repository/order.repository.js';
import { OrdersService, type PlaceOrder } from '../../src/services/orders.service.js';
import {
  CUSTOMER_ID,
  IDEMPOTENCY_KEY,
  MUG_ID,
  ORDER_ID,
  SHIRT_ID,
  aCatalogProduct,
  anOrder,
  anOrderItem,
} from '../builders/order.builder.js';

const MUG = aCatalogProduct({
  productId: MUG_ID,
  sku: 'MUG-BLUE',
  name: 'Blue Mug',
  pricePaise: 19999,
});

function request(overrides: Partial<PlaceOrder> = {}): PlaceOrder {
  return {
    customerId: CUSTOMER_ID,
    paymentMethod: PaymentMethod.WALLET,
    items: [{ productId: SHIRT_ID, quantity: 2 }],
    idempotencyKey: IDEMPOTENCY_KEY,
    ...overrides,
  };
}

describe('OrdersService', () => {
  let orders: Mocked<OrderRepository>;
  let catalog: Mocked<CatalogRepository>;
  let service: OrdersService;

  beforeEach(() => {
    orders = {
      findById: vi.fn<OrderRepository['findById']>(),
      findByIdempotencyKey: vi.fn<OrderRepository['findByIdempotencyKey']>(),
      list: vi.fn<OrderRepository['list']>(),
      insert: vi.fn<OrderRepository['insert']>((order) => Promise.resolve(order)),
      changeStatus: vi.fn<OrderRepository['changeStatus']>(),
    };
    catalog = { findByIds: vi.fn<CatalogRepository['findByIds']>() };
    orders.findByIdempotencyKey.mockResolvedValue(null);
    catalog.findByIds.mockResolvedValue([aCatalogProduct(), MUG]);
    service = new OrdersService(orders, catalog, new OrderStateMachine());
  });

  describe('place', () => {
    it('prices a new order from the catalog and saves it as PENDING', async () => {
      const { order, replayed } = await service.place(
        request({
          items: [
            { productId: SHIRT_ID, quantity: 2 },
            { productId: MUG_ID, quantity: 1 },
          ],
        }),
      );

      expect(replayed).toBe(false);
      expect(order).toMatchObject({
        customerId: CUSTOMER_ID,
        status: OrderStatus.PENDING,
        // 2 × ₹499.50 + 1 × ₹199.99 = ₹1,198.99
        subtotalPaise: 119899,
        discountPaise: 0,
        totalPaise: 119899,
        currency: 'INR',
        paymentMethod: PaymentMethod.WALLET,
        couponCode: null,
        cancelReason: null,
        idempotencyKey: IDEMPOTENCY_KEY,
      });
      expect(orders.insert).toHaveBeenCalledWith(order);
    });

    it('copies each product’s SKU, name and price into the order lines', async () => {
      const { order } = await service.place(
        request({ items: [{ productId: MUG_ID, quantity: 3 }] }),
      );

      expect(order.items).toEqual([
        expect.objectContaining({
          productId: MUG_ID,
          sku: 'MUG-BLUE',
          productName: 'Blue Mug',
          quantity: 3,
          unitPricePaise: 19999,
        }),
      ]);
    });

    it('records the first history entry: from nothing to PENDING', async () => {
      const { order } = await service.place(request());

      expect(order.statusHistory).toEqual([
        expect.objectContaining({
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          reason: 'Order placed',
        }),
      ]);
    });

    it('looks up every product in one catalog query', async () => {
      await service.place(
        request({
          items: [
            { productId: SHIRT_ID, quantity: 1 },
            { productId: MUG_ID, quantity: 1 },
          ],
        }),
      );

      expect(catalog.findByIds).toHaveBeenCalledTimes(1);
      expect(catalog.findByIds).toHaveBeenCalledWith([SHIRT_ID, MUG_ID]);
    });

    describe('idempotency', () => {
      it('returns the earlier order for a repeated key, creating nothing', async () => {
        const earlier = anOrder();
        orders.findByIdempotencyKey.mockResolvedValue(earlier);

        await expect(service.place(request())).resolves.toEqual({ order: earlier, replayed: true });
        expect(catalog.findByIds).not.toHaveBeenCalled();
        expect(orders.insert).not.toHaveBeenCalled();
      });

      it('treats the same lines in a different order as the same request', async () => {
        orders.findByIdempotencyKey.mockResolvedValue(
          anOrder({
            items: [
              anOrderItem({ productId: MUG_ID, quantity: 1 }),
              anOrderItem({ productId: SHIRT_ID, quantity: 2 }),
            ],
          }),
        );

        const { replayed } = await service.place(
          request({
            items: [
              { productId: SHIRT_ID, quantity: 2 },
              { productId: MUG_ID, quantity: 1 },
            ],
          }),
        );

        expect(replayed).toBe(true);
      });

      it.each([
        ['another customer', { customerId: '99999999-9999-4999-8999-999999999999' }],
        ['another payment method', { paymentMethod: PaymentMethod.CARD }],
        ['another quantity', { items: [{ productId: SHIRT_ID, quantity: 3 }] }],
        [
          'an extra product',
          {
            items: [
              { productId: SHIRT_ID, quantity: 2 },
              { productId: MUG_ID, quantity: 1 },
            ],
          },
        ],
      ] satisfies [string, Partial<PlaceOrder>][])(
        'rejects a repeated key used for %s',
        async (_case, changes) => {
          orders.findByIdempotencyKey.mockResolvedValue(anOrder());

          const placed = service.place(request(changes));

          await expect(placed).rejects.toBeInstanceOf(IdempotencyKeyReusedException);
          await expect(placed).rejects.toMatchObject({
            code: 'IDEMPOTENCY_KEY_REUSED',
            details: { idempotencyKey: IDEMPOTENCY_KEY, existingOrderId: ORDER_ID },
          });
          expect(orders.insert).not.toHaveBeenCalled();
        },
      );

      it('returns the winning order when a retry with the same key is inserted first', async () => {
        const winner = anOrder();
        orders.findByIdempotencyKey.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
        orders.insert.mockResolvedValue(null);

        await expect(service.place(request())).resolves.toEqual({ order: winner, replayed: true });
        expect(orders.findByIdempotencyKey).toHaveBeenCalledTimes(2);
      });

      it('rejects the request if the winning order was placed with different details', async () => {
        orders.findByIdempotencyKey
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(anOrder({ paymentMethod: PaymentMethod.UPI }));
        orders.insert.mockResolvedValue(null);

        await expect(service.place(request())).rejects.toBeInstanceOf(
          IdempotencyKeyReusedException,
        );
      });

      it('fails loudly if the key is reported taken but no order has it', async () => {
        orders.insert.mockResolvedValue(null);

        await expect(service.place(request())).rejects.toThrow(
          `Insert reported the Idempotency-Key ${IDEMPOTENCY_KEY} as taken, but no order has it`,
        );
      });
    });

    describe('products', () => {
      it('rejects products missing from the catalog, listing all of them', async () => {
        const unknownId = '55555555-5555-4555-8555-555555555555';
        const otherUnknownId = '66666666-6666-4666-8666-666666666666';
        catalog.findByIds.mockResolvedValue([aCatalogProduct()]);

        const placed = service.place(
          request({
            items: [
              { productId: SHIRT_ID, quantity: 1 },
              { productId: unknownId, quantity: 1 },
              { productId: otherUnknownId, quantity: 1 },
            ],
          }),
        );

        await expect(placed).rejects.toBeInstanceOf(UnknownProductsException);
        await expect(placed).rejects.toMatchObject({
          code: 'UNKNOWN_PRODUCTS',
          details: { productIds: [unknownId, otherUnknownId] },
        });
        expect(orders.insert).not.toHaveBeenCalled();
      });

      it('rejects products that can no longer be ordered', async () => {
        catalog.findByIds.mockResolvedValue([aCatalogProduct({ active: false }), MUG]);

        const placed = service.place(
          request({
            items: [
              { productId: SHIRT_ID, quantity: 1 },
              { productId: MUG_ID, quantity: 1 },
            ],
          }),
        );

        await expect(placed).rejects.toBeInstanceOf(InactiveProductsException);
        await expect(placed).rejects.toMatchObject({ details: { productIds: [SHIRT_ID] } });
        expect(orders.insert).not.toHaveBeenCalled();
      });

      it('reports unknown products before inactive ones', async () => {
        catalog.findByIds.mockResolvedValue([aCatalogProduct({ active: false })]);

        await expect(
          service.place(
            request({
              items: [
                { productId: SHIRT_ID, quantity: 1 },
                { productId: MUG_ID, quantity: 1 },
              ],
            }),
          ),
        ).rejects.toBeInstanceOf(UnknownProductsException);
      });

      it('rejects an order whose total would not fit the database column', async () => {
        catalog.findByIds.mockResolvedValue([aCatalogProduct({ pricePaise: 999_999_999_999 })]);

        await expect(service.place(request())).rejects.toBeInstanceOf(OrderTotalTooLargeException);
      });
    });
  });

  describe('getById', () => {
    it('returns the order', async () => {
      const order = anOrder();
      orders.findById.mockResolvedValue(order);

      await expect(service.getById(ORDER_ID)).resolves.toBe(order);
    });

    it('throws ORDER_NOT_FOUND, naming the ID, when it does not exist', async () => {
      orders.findById.mockResolvedValue(null);

      await expect(service.getById(ORDER_ID)).rejects.toMatchObject({
        code: 'ORDER_NOT_FOUND',
        details: { orderId: ORDER_ID },
      });
    });
  });

  describe('list', () => {
    it('passes the filters and page to the repository and counts the pages', async () => {
      const items = [anOrder()];
      orders.list.mockResolvedValue({ items, totalItems: 21 });

      const page = await service.list(
        { customerId: CUSTOMER_ID, status: OrderStatus.PENDING },
        { page: 2, limit: 10 },
      );

      expect(orders.list).toHaveBeenCalledWith(
        { customerId: CUSTOMER_ID, status: OrderStatus.PENDING },
        { page: 2, limit: 10 },
      );
      expect(page).toEqual({ items, meta: { page: 2, limit: 10, totalItems: 21, totalPages: 3 } });
    });

    it('returns an empty page when nothing matches', async () => {
      orders.list.mockResolvedValue({ items: [], totalItems: 0 });

      const page = await service.list({}, { page: 1, limit: 20 });

      expect(page.meta).toEqual({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
    });
  });

  describe('cancel', () => {
    it.each([OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT, OrderStatus.CONFIRMED])(
      'cancels a %s order for the customer, checking its version',
      async (status) => {
        const cancelled = anOrder({ status: OrderStatus.CANCELLED });
        orders.findById
          .mockResolvedValueOnce(anOrder({ status, version: 4 }))
          .mockResolvedValueOnce(cancelled);
        orders.changeStatus.mockResolvedValue(true);

        await expect(service.cancel(ORDER_ID)).resolves.toBe(cancelled);
        expect(orders.changeStatus).toHaveBeenCalledWith(ORDER_ID, 4, status, {
          to: OrderStatus.CANCELLED,
          cancelReason: CancelReason.CUSTOMER_REQUEST,
          reason: 'Cancelled by the customer',
        });
      },
    );

    it.each([OrderStatus.FAILED, OrderStatus.CANCELLED, OrderStatus.REFUNDED])(
      'refuses to cancel a %s order with INVALID_ORDER_STATE',
      async (status) => {
        orders.findById.mockResolvedValue(anOrder({ status }));

        const cancelled = service.cancel(ORDER_ID);

        await expect(cancelled).rejects.toBeInstanceOf(InvalidOrderStateException);
        await expect(cancelled).rejects.toMatchObject({
          details: { orderId: ORDER_ID, from: status, to: OrderStatus.CANCELLED },
        });
        expect(orders.changeStatus).not.toHaveBeenCalled();
      },
    );

    it('throws ORDER_CHANGED_CONCURRENTLY when someone else updated the order first', async () => {
      orders.findById.mockResolvedValue(anOrder());
      orders.changeStatus.mockResolvedValue(false);

      await expect(service.cancel(ORDER_ID)).rejects.toBeInstanceOf(
        OrderChangedConcurrentlyException,
      );
    });

    it('throws ORDER_NOT_FOUND when the order does not exist', async () => {
      orders.findById.mockResolvedValue(null);

      await expect(service.cancel(ORDER_ID)).rejects.toBeInstanceOf(OrderNotFoundException);
      expect(orders.changeStatus).not.toHaveBeenCalled();
    });
  });
});
