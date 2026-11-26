import { CommonModule, type ErrorResponseBody, setupApp } from '@app/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { Mocked } from 'vitest';
import { API_DOCS } from '../../src/constants.js';
import { CouponsController } from '../../src/controllers/coupons.controller.js';
import { CouponType } from '../../src/domain/enums.js';
import { DuplicateCouponException } from '../../src/exceptions/duplicate-coupon.exception.js';
import { CouponsService } from '../../src/services/coupons.service.js';
import { aCoupon } from '../builders/coupon.builder.js';

const BASE = '/api/v1/coupons';

describe('CouponsController', () => {
  let app: INestApplication<App>;
  const service: Mocked<Pick<CouponsService, 'create'>> = {
    create: vi.fn<CouponsService['create']>(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule.forRoot({ serviceName: 'order-service' })],
      controllers: [CouponsController],
      providers: [{ provide: CouponsService, useValue: service }],
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

  describe('POST /api/v1/coupons', () => {
    it('creates the coupon, upper-casing the code, and returns 201', async () => {
      service.create.mockResolvedValue(aCoupon());

      const res = await request(app.getHttpServer())
        .post(BASE)
        .send({ code: ' save10 ', type: 'PERCENTAGE', percentOff: 10 })
        .expect(201);

      expect(service.create).toHaveBeenCalledWith({
        code: 'SAVE10',
        type: CouponType.PERCENTAGE,
        percentOff: 10,
        amountOffPaise: null,
        minOrderPaise: 0,
        expiresAt: null,
      });
      expect(res.body).toMatchObject({
        code: 'SAVE10',
        type: 'PERCENTAGE',
        percentOff: 10,
        active: true,
      });
    });

    it('returns 400 VALIDATION_FAILED for a coupon missing its amount, without calling the service', async () => {
      const res = await request(app.getHttpServer())
        .post(BASE)
        .send({ code: 'FLAT100', type: 'FLAT' })
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        details: { fields: [expect.objectContaining({ field: 'amountOff' })] },
      });
      expect(service.create).not.toHaveBeenCalled();
    });

    it('returns 409 DUPLICATE_COUPON when the code is taken', async () => {
      service.create.mockRejectedValue(new DuplicateCouponException('SAVE10'));

      const res = await request(app.getHttpServer())
        .post(BASE)
        .send({ code: 'SAVE10', type: 'PERCENTAGE', percentOff: 10 })
        .expect(409);

      expect((res.body as ErrorResponseBody).code).toBe('DUPLICATE_COUPON');
    });
  });
});
