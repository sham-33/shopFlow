import { CommonModule, type ErrorResponseBody, setupApp } from '@app/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { Mocked } from 'vitest';
import { API_DOCS } from '../../src/constants.js';
import { ProductsController } from '../../src/controllers/products.controller.js';
import { DuplicateSkuException } from '../../src/exceptions/duplicate-sku.exception.js';
import { ProductNotFoundException } from '../../src/exceptions/product-not-found.exception.js';
import { ProductsService } from '../../src/services/products.service.js';
import { PRODUCT_ID, aProduct } from '../builders/product.builder.js';

type ProductsServiceMock = Mocked<
  Pick<ProductsService, 'create' | 'getById' | 'list' | 'update' | 'restock'>
>;

const BASE = '/api/v1/products';

/** What the API returns for aProduct(). */
const PRODUCT_RESPONSE = {
  id: PRODUCT_ID,
  sku: 'TSHIRT-RED-M',
  name: 'Red T-shirt (M)',
  price: 499.5,
  active: true,
  stock: { available: 10, reserved: 0 },
  createdAt: '2026-11-23T10:00:00.000Z',
  updatedAt: '2026-11-23T10:00:00.000Z',
};

// The controller runs behind the real HTTP stack (routing, /api/v1 prefix,
// trimming, validation, ParseIdPipe, error filter); only the service is mocked.
describe('ProductsController', () => {
  let app: INestApplication<App>;
  const service: ProductsServiceMock = {
    create: vi.fn<ProductsService['create']>(),
    getById: vi.fn<ProductsService['getById']>(),
    list: vi.fn<ProductsService['list']>(),
    update: vi.fn<ProductsService['update']>(),
    restock: vi.fn<ProductsService['restock']>(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule.forRoot({ serviceName: 'inventory-service' })],
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: service }],
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

  describe('POST /api/v1/products', () => {
    it('creates the product, converting rupees to paise, and returns 201', async () => {
      service.create.mockResolvedValue(aProduct());

      await http()
        .post(BASE)
        .send({
          sku: 'TSHIRT-RED-M',
          name: '  Red T-shirt (M) ',
          price: 499.5,
          initialQuantity: 10,
        })
        .expect(201, PRODUCT_RESPONSE);

      expect(service.create).toHaveBeenCalledWith({
        sku: 'TSHIRT-RED-M',
        name: 'Red T-shirt (M)',
        pricePaise: 49950,
        initialQuantity: 10,
      });
    });

    it('starts with 0 units when initialQuantity is left out', async () => {
      service.create.mockResolvedValue(aProduct({}, { availableQty: 0 }));

      await http()
        .post(BASE)
        .send({ sku: 'TSHIRT-RED-M', name: 'Red T-shirt (M)', price: 499.5 })
        .expect(201);

      expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ initialQuantity: 0 }));
    });

    it('returns 400 VALIDATION_FAILED for a bad body and never calls the service', async () => {
      const res = await http()
        .post(BASE)
        .send({ sku: 'tshirt', name: 'Red T-shirt', price: 1.234 })
        .expect(400);

      const body = res.body as ErrorResponseBody;
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.details).toEqual({
        fields: expect.arrayContaining([
          expect.objectContaining({ field: 'sku' }),
          expect.objectContaining({ field: 'price' }),
        ]) as unknown,
      });
      expect(service.create).not.toHaveBeenCalled();
    });

    it('returns 409 DUPLICATE_SKU when the SKU is taken', async () => {
      service.create.mockRejectedValue(new DuplicateSkuException('TSHIRT-RED-M'));

      const res = await http()
        .post(BASE)
        .send({ sku: 'TSHIRT-RED-M', name: 'Red T-shirt (M)', price: 499.5 })
        .expect(409);

      expect(res.body).toMatchObject({
        code: 'DUPLICATE_SKU',
        details: { sku: 'TSHIRT-RED-M' },
      });
      expect(res.get('X-Error-Code')).toBe('DUPLICATE_SKU');
    });

    it('returns 500 INTERNAL_ERROR, without the cause, when the service fails unexpectedly', async () => {
      service.create.mockRejectedValue(new Error('connection reset by peer'));

      const res = await http()
        .post(BASE)
        .send({ sku: 'TSHIRT-RED-M', name: 'Red T-shirt (M)', price: 499.5 })
        .expect(500);

      expect(res.body).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
      expect(JSON.stringify(res.body)).not.toContain('connection reset');
    });
  });

  describe('GET /api/v1/products', () => {
    it('returns one page of products with their stock', async () => {
      service.list.mockResolvedValue({
        items: [aProduct()],
        meta: { page: 2, limit: 5, totalItems: 6, totalPages: 2 },
      });

      await http()
        .get(`${BASE}?search=%20shirt%20&page=2&limit=5`)
        .expect(200, {
          items: [PRODUCT_RESPONSE],
          meta: { page: 2, limit: 5, totalItems: 6, totalPages: 2 },
        });

      expect(service.list).toHaveBeenCalledWith({ search: 'shirt' }, { page: 2, limit: 5 });
    });

    it('uses page 1, 20 per page and no search by default', async () => {
      service.list.mockResolvedValue({
        items: [],
        meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
      });

      await http().get(BASE).expect(200);

      expect(service.list).toHaveBeenCalledWith({ search: undefined }, { page: 1, limit: 20 });
    });

    it.each([
      ['limit above 100', '?limit=101'],
      ['page 0', '?page=0'],
      ['non-numeric page', '?page=abc'],
      ['search over 100 characters', `?search=${'a'.repeat(101)}`],
      ['unknown parameter', '?sort=name'],
    ])('returns 400 VALIDATION_FAILED for %s', async (_case, query) => {
      const res = await http().get(`${BASE}${query}`).expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('VALIDATION_FAILED');
      expect(service.list).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('returns the product', async () => {
      service.getById.mockResolvedValue(aProduct());

      await http().get(`${BASE}/${PRODUCT_ID}`).expect(200, PRODUCT_RESPONSE);

      expect(service.getById).toHaveBeenCalledWith(PRODUCT_ID);
    });

    it('returns 400 INVALID_ID for an ID that is not a UUID, without calling the service', async () => {
      const res = await http().get(`${BASE}/not-a-uuid`).expect(400);

      expect(res.body).toMatchObject({
        code: 'INVALID_ID',
        details: { parameter: 'id' },
      });
      expect(service.getById).not.toHaveBeenCalled();
    });

    it('returns 404 PRODUCT_NOT_FOUND when the product does not exist', async () => {
      service.getById.mockRejectedValue(new ProductNotFoundException(PRODUCT_ID));

      const res = await http().get(`${BASE}/${PRODUCT_ID}`).expect(404);

      expect(res.body).toMatchObject({
        code: 'PRODUCT_NOT_FOUND',
        details: { productId: PRODUCT_ID },
        path: `${BASE}/${PRODUCT_ID}`,
      });
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('passes only the given fields to the service, with the price in paise', async () => {
      service.update.mockResolvedValue(aProduct({ pricePaise: 54900, active: false }));

      const res = await http()
        .patch(`${BASE}/${PRODUCT_ID}`)
        .send({ price: 549, active: false })
        .expect(200);

      expect(service.update).toHaveBeenCalledWith(PRODUCT_ID, {
        pricePaise: 54900,
        active: false,
      });
      expect(res.body).toMatchObject({ price: 549, active: false });
    });

    it.each([
      ['a null name', { name: null }],
      ['an empty name', { name: '   ' }],
      ['a negative price', { price: -1 }],
      ['active as a string', { active: 'false' }],
      ['a changed SKU', { sku: 'NEW-SKU' }],
    ])('returns 400 VALIDATION_FAILED for %s', async (_case, body) => {
      const res = await http().patch(`${BASE}/${PRODUCT_ID}`).send(body).expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('VALIDATION_FAILED');
      expect(service.update).not.toHaveBeenCalled();
    });

    it('returns 400 INVALID_ID for an ID that is not a UUID', async () => {
      await http().patch(`${BASE}/123`).send({ name: 'x' }).expect(400);

      expect(service.update).not.toHaveBeenCalled();
    });

    it('returns 404 PRODUCT_NOT_FOUND when the product does not exist', async () => {
      service.update.mockRejectedValue(new ProductNotFoundException(PRODUCT_ID));

      const res = await http().patch(`${BASE}/${PRODUCT_ID}`).send({ name: 'x' }).expect(404);

      expect((res.body as ErrorResponseBody).code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('POST /api/v1/products/:id/restock', () => {
    it('adds stock and returns 200 (not 201) with the new stock', async () => {
      service.restock.mockResolvedValue(aProduct({}, { availableQty: 15 }));

      const res = await http()
        .post(`${BASE}/${PRODUCT_ID}/restock`)
        .send({ quantity: 5 })
        .expect(200);

      expect(service.restock).toHaveBeenCalledWith(PRODUCT_ID, 5);
      expect(res.body).toMatchObject({ stock: { available: 15, reserved: 0 } });
    });

    it.each([
      ['0', 0],
      ['a negative number', -3],
      ['a fraction', 1.5],
      ['more than 1,000,000', 1_000_001],
      ['a string', '5'],
    ])('returns 400 VALIDATION_FAILED for a quantity of %s', async (_case, quantity) => {
      const res = await http().post(`${BASE}/${PRODUCT_ID}/restock`).send({ quantity }).expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('VALIDATION_FAILED');
      expect(service.restock).not.toHaveBeenCalled();
    });

    it('returns 404 PRODUCT_NOT_FOUND when the product does not exist', async () => {
      service.restock.mockRejectedValue(new ProductNotFoundException(PRODUCT_ID));

      await http().post(`${BASE}/${PRODUCT_ID}/restock`).send({ quantity: 5 }).expect(404);
    });
  });
});
