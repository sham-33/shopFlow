import { CommonModule, type ErrorResponseBody, setupApp } from '@app/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { Mocked } from 'vitest';
import { API_DOCS } from '../../src/constants.js';
import { OrdersController } from '../../src/controllers/orders.controller.js';
import { OrderStatus, PaymentMethod } from '../../src/domain/enums.js';
import { IdempotencyKeyReusedException } from '../../src/exceptions/idempotency-key-reused.exception.js';
import { InvalidOrderStateException } from '../../src/exceptions/invalid-order-state.exception.js';
import { OrderChangedConcurrentlyException } from '../../src/exceptions/order-changed-concurrently.exception.js';
import { OrderNotFoundException } from '../../src/exceptions/order-not-found.exception.js';
import { UnknownProductsException } from '../../src/exceptions/unknown-products.exception.js';
import { OrdersService } from '../../src/services/orders.service.js';
import {
  CUSTOMER_ID,
  IDEMPOTENCY_KEY,
  MUG_ID,
  ORDER_ID,
  SHIRT_ID,
  anOrder,
} from '../builders/order.builder.js';

type OrdersServiceMock = Mocked<Pick<OrdersService, 'place' | 'getById' | 'list' | 'cancel'>>;

const BASE = '/api/v1/orders';

const SUMMARY = {
  id: ORDER_ID,
  customerId: CUSTOMER_ID,
  status: 'PENDING',
  subtotal: 999,
  discount: 0,
  total: 999,
  currency: 'INR',
  paymentMethod: 'WALLET',
  couponCode: null,
  cancelReason: null,
  createdAt: '2026-11-26T10:00:00.000Z',
  updatedAt: '2026-11-26T10:00:00.000Z',
};

/** What the API returns for anOrder(). */
const ORDER_RESPONSE = {
  ...SUMMARY,
  items: [
    {
      productId: SHIRT_ID,
      sku: 'TSHIRT-RED-M',
      name: 'Red T-shirt (M)',
      quantity: 2,
      unitPrice: 499.5,
      lineTotal: 999,
    },
  ],
  history: [{ from: null, to: 'PENDING', reason: 'Order placed', at: '2026-11-26T10:00:00.000Z' }],
};

const VALID_BODY = {
  customerId: CUSTOMER_ID,
  paymentMethod: 'WALLET',
  items: [{ productId: SHIRT_ID, quantity: 2 }],
};

// The controller runs behind the real HTTP stack; only the service is mocked.
describe('OrdersController', () => {
  let app: INestApplication<App>;
  const service: OrdersServiceMock = {
    place: vi.fn<OrdersService['place']>(),
    getById: vi.fn<OrdersService['getById']>(),
    list: vi.fn<OrdersService['list']>(),
    cancel: vi.fn<OrdersService['cancel']>(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule.forRoot({ serviceName: 'order-service' })],
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    setupApp(app, API_DOCS);
    await app.init();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const placeOrder = (body: unknown = VALID_BODY, key: string | null = IDEMPOTENCY_KEY) => {
    const call = http()
      .post(BASE)
      .send(body as object);
    return key === null ? call : call.set('Idempotency-Key', key);
  };

  describe('POST /api/v1/orders', () => {
    it('places the order and returns 201 with its lines and history', async () => {
      service.place.mockResolvedValue({ order: anOrder(), replayed: false });

      const res = await placeOrder().expect(201, ORDER_RESPONSE);

      expect(service.place).toHaveBeenCalledWith({
        ...VALID_BODY,
        paymentMethod: PaymentMethod.WALLET,
        idempotencyKey: IDEMPOTENCY_KEY,
      });
      expect(res.get('Idempotent-Replayed')).toBeUndefined();
    });

    it('marks a repeated request with Idempotent-Replayed: true', async () => {
      service.place.mockResolvedValue({ order: anOrder(), replayed: true });

      const res = await placeOrder().expect(201, ORDER_RESPONSE);

      expect(res.get('Idempotent-Replayed')).toBe('true');
    });

    it.each([
      ['missing', null],
      ['too long', 'k'.repeat(101)],
      ['with a space', 'checkout 1'],
    ])('returns 400 when the Idempotency-Key is %s', async (_case, key) => {
      const res = await placeOrder(VALID_BODY, key).expect(400);

      expect(res.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        details: { fields: [{ field: 'Idempotency-Key' }] },
      });
      expect(service.place).not.toHaveBeenCalled();
    });

    it.each([
      ['no items', { ...VALID_BODY, items: [] }],
      [
        'the same product twice',
        {
          ...VALID_BODY,
          items: [
            { productId: SHIRT_ID, quantity: 1 },
            { productId: SHIRT_ID, quantity: 1 },
          ],
        },
      ],
      ['a quantity of 11', { ...VALID_BODY, items: [{ productId: SHIRT_ID, quantity: 11 }] }],
      ['a quantity of 0', { ...VALID_BODY, items: [{ productId: SHIRT_ID, quantity: 0 }] }],
      [
        'a product ID that is not a UUID',
        { ...VALID_BODY, items: [{ productId: 'abc', quantity: 1 }] },
      ],
      ['an unknown payment method', { ...VALID_BODY, paymentMethod: 'CASH' }],
      ['a customer ID that is not a UUID', { ...VALID_BODY, customerId: '42' }],
      ['a price sent by the client', { ...VALID_BODY, total: 1 }],
      [
        '51 lines',
        {
          ...VALID_BODY,
          items: Array.from({ length: 51 }, (_, i) => ({
            productId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
            quantity: 1,
          })),
        },
      ],
    ])('returns 400 VALIDATION_FAILED for %s', async (_case, body) => {
      const res = await placeOrder(body).expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('VALIDATION_FAILED');
      expect(service.place).not.toHaveBeenCalled();
    });

    it('accepts 50 lines, the most an order may have', async () => {
      service.place.mockResolvedValue({ order: anOrder(), replayed: false });
      const items = Array.from({ length: 50 }, (_, i) => ({
        productId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        quantity: 1,
      }));

      await placeOrder({ ...VALID_BODY, items }).expect(201);
    });

    it('returns 409 IDEMPOTENCY_KEY_REUSED when the key belongs to a different order', async () => {
      service.place.mockRejectedValue(new IdempotencyKeyReusedException(IDEMPOTENCY_KEY, ORDER_ID));

      const res = await placeOrder().expect(409);

      expect(res.body).toMatchObject({
        code: 'IDEMPOTENCY_KEY_REUSED',
        details: { existingOrderId: ORDER_ID },
      });
    });

    it('returns 422 UNKNOWN_PRODUCTS for products missing from the catalog', async () => {
      service.place.mockRejectedValue(new UnknownProductsException([MUG_ID]));

      const res = await placeOrder().expect(422);

      expect(res.body).toMatchObject({
        code: 'UNKNOWN_PRODUCTS',
        details: { productIds: [MUG_ID] },
      });
    });
  });

  describe('GET /api/v1/orders', () => {
    it('returns one page of order summaries, passing the filters on', async () => {
      service.list.mockResolvedValue({
        items: [anOrder()],
        meta: { page: 2, limit: 5, totalItems: 6, totalPages: 2 },
      });

      await http()
        .get(`${BASE}?customerId=${CUSTOMER_ID}&status=PENDING&page=2&limit=5`)
        .expect(200, {
          items: [SUMMARY],
          meta: { page: 2, limit: 5, totalItems: 6, totalPages: 2 },
        });

      expect(service.list).toHaveBeenCalledWith(
        { customerId: CUSTOMER_ID, status: OrderStatus.PENDING },
        { page: 2, limit: 5 },
      );
    });

    it('lists every order, 20 per page, when no filters are given', async () => {
      service.list.mockResolvedValue({
        items: [],
        meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
      });

      await http().get(BASE).expect(200);

      expect(service.list).toHaveBeenCalledWith(
        { customerId: undefined, status: undefined },
        { page: 1, limit: 20 },
      );
    });

    it.each([
      ['an unknown status', '?status=SHIPPED'],
      ['a customer ID that is not a UUID', '?customerId=42'],
      ['limit above 100', '?limit=101'],
    ])('returns 400 VALIDATION_FAILED for %s', async (_case, query) => {
      const res = await http().get(`${BASE}${query}`).expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('VALIDATION_FAILED');
      expect(service.list).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('returns the order with its lines and history', async () => {
      service.getById.mockResolvedValue(anOrder());

      await http().get(`${BASE}/${ORDER_ID}`).expect(200, ORDER_RESPONSE);

      expect(service.getById).toHaveBeenCalledWith(ORDER_ID);
    });

    it('returns 400 INVALID_ID for an ID that is not a UUID', async () => {
      const res = await http().get(`${BASE}/abc`).expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('INVALID_ID');
      expect(service.getById).not.toHaveBeenCalled();
    });

    it('returns 404 ORDER_NOT_FOUND when the order does not exist', async () => {
      service.getById.mockRejectedValue(new OrderNotFoundException(ORDER_ID));

      const res = await http().get(`${BASE}/${ORDER_ID}`).expect(404);

      expect(res.body).toMatchObject({ code: 'ORDER_NOT_FOUND', details: { orderId: ORDER_ID } });
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    it('cancels the order and returns 202 with it', async () => {
      service.cancel.mockResolvedValue(
        anOrder({ status: OrderStatus.CANCELLED, cancelReason: null }),
      );

      const res = await http().post(`${BASE}/${ORDER_ID}/cancel`).expect(202);

      expect(service.cancel).toHaveBeenCalledWith(ORDER_ID);
      expect(res.body).toMatchObject({ id: ORDER_ID, status: 'CANCELLED' });
    });

    it('returns 400 INVALID_ID for an ID that is not a UUID', async () => {
      await http().post(`${BASE}/abc/cancel`).expect(400);

      expect(service.cancel).not.toHaveBeenCalled();
    });

    it('returns 404 ORDER_NOT_FOUND when the order does not exist', async () => {
      service.cancel.mockRejectedValue(new OrderNotFoundException(ORDER_ID));

      await http().post(`${BASE}/${ORDER_ID}/cancel`).expect(404);
    });

    it.each([
      [
        'INVALID_ORDER_STATE',
        new InvalidOrderStateException(ORDER_ID, OrderStatus.FAILED, OrderStatus.CANCELLED),
      ],
      ['ORDER_CHANGED_CONCURRENTLY', new OrderChangedConcurrentlyException(ORDER_ID)],
    ])('returns 409 %s when the order cannot be cancelled now', async (code, error) => {
      service.cancel.mockRejectedValue(error);

      const res = await http().post(`${BASE}/${ORDER_ID}/cancel`).expect(409);

      expect((res.body as ErrorResponseBody).code).toBe(code);
    });
  });
});
