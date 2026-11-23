import {
  Body,
  Controller,
  Get,
  type INestApplication,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { CommonModule } from '../src/common.module.js';
import { getCorrelationId } from '../src/correlation/correlation-id.js';
import type { ErrorResponseBody } from '../src/exceptions/all-exceptions.filter.js';
import {
  type DomainErrorKind,
  DomainException,
} from '../src/exceptions/domain.exception.js';
import type { FieldError } from '../src/exceptions/request-validation.exception.js';
import { PaginationQueryDto } from '../src/pagination/pagination.js';

class ItemDto {
  @IsInt()
  @Min(1)
  quantity: number;
}

class CreateThingDto {
  @IsString()
  @Length(3, 20)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

class TestDomainException extends DomainException {
  constructor(kind: DomainErrorKind) {
    super({ code: 'TEST_ERROR', kind, message: `A ${kind} error` });
  }
}

@Controller('things')
class ThingsController {
  @Get()
  list(@Query() query: PaginationQueryDto) {
    return {
      page: query.page,
      limit: query.limit,
      isDto: query instanceof PaginationQueryDto,
      correlationId: getCorrelationId(),
    };
  }

  @Post()
  create(@Body() body: CreateThingDto): CreateThingDto {
    return body;
  }

  @Get('domain/:kind')
  domainError(@Param('kind') kind: DomainErrorKind): never {
    throw new TestDomainException(kind);
  }

  @Get('duplicate')
  duplicate(): never {
    // What TypeORM's QueryFailedError looks like for a Postgres unique violation.
    throw Object.assign(new Error('duplicate key value'), { code: '23505' });
  }

  @Get('crash')
  crash(): never {
    throw new Error('secret internal detail');
  }
}

describe('CommonModule', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule.forRoot({ serviceName: 'test-service' })],
      controllers: [ThingsController],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('correlation ID', () => {
    it('creates one when the request has none and returns it in a header', async () => {
      const res = await request(app.getHttpServer()).get('/things').expect(200);

      const correlationId = res.get('X-Correlation-Id');
      expect(correlationId).toMatch(/^[0-9a-f-]{36}$/);
      expect((res.body as { correlationId: string }).correlationId).toBe(
        correlationId,
      );
    });

    it('keeps a valid incoming ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/things')
        .set('X-Correlation-Id', 'c-91ab')
        .expect(200);

      expect(res.get('X-Correlation-Id')).toBe('c-91ab');
      expect((res.body as { correlationId: string }).correlationId).toBe(
        'c-91ab',
      );
    });

    it('replaces an incoming ID with unsafe characters', async () => {
      const res = await request(app.getHttpServer())
        .get('/things')
        .set('X-Correlation-Id', 'bad id\twith spaces')
        .expect(200);

      expect(res.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('pagination query', () => {
    it('uses page 1 and limit 20 by default', async () => {
      const res = await request(app.getHttpServer()).get('/things').expect(200);

      expect(res.body).toMatchObject({ page: 1, limit: 20, isDto: true });
    });

    it('turns query strings into numbers', async () => {
      const res = await request(app.getHttpServer())
        .get('/things?page=3&limit=50')
        .expect(200);

      expect(res.body).toMatchObject({ page: 3, limit: 50 });
    });

    it('rejects a limit above 100', async () => {
      const res = await request(app.getHttpServer())
        .get('/things?limit=500')
        .expect(400);

      expect((res.body as ErrorResponseBody).details).toEqual({
        fields: [
          { field: 'limit', messages: ['limit must not be greater than 100'] },
        ],
      });
    });
  });

  describe('validation', () => {
    it('returns 400 with one entry per bad field, including nested and unknown ones', async () => {
      const res = await request(app.getHttpServer())
        .post('/things')
        .set('X-Correlation-Id', 'c-validation')
        .send({ name: 'ab', items: [{ quantity: 0 }], extra: true })
        .expect(400);

      const fieldErrors = [
        {
          field: 'name',
          messages: ['name must be longer than or equal to 3 characters'],
        },
        {
          field: 'items.0.quantity',
          messages: ['quantity must not be less than 1'],
        },
        { field: 'extra', messages: ['property extra should not exist'] },
      ];
      const body = res.body as ErrorResponseBody;
      expect(body).toMatchObject({
        statusCode: 400,
        error: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        path: '/things',
        correlationId: 'c-validation',
      });
      // class-validator decides the order of the field errors, so ignore it.
      const { fields } = body.details as { fields: FieldError[] };
      expect(fields).toHaveLength(fieldErrors.length);
      expect(fields).toEqual(expect.arrayContaining(fieldErrors));
    });

    it('passes a valid body through as a DTO', async () => {
      await request(app.getHttpServer())
        .post('/things')
        .send({ name: 'widget', items: [{ quantity: 2 }] })
        .expect(201, { name: 'widget', items: [{ quantity: 2 }] });
    });
  });

  describe('errors', () => {
    it.each([
      ['invalid_input', 400],
      ['not_found', 404],
      ['conflict', 409],
      ['unprocessable', 422],
    ])('maps a %s DomainException to %i', async (kind, status) => {
      const res = await request(app.getHttpServer())
        .get(`/things/domain/${kind}`)
        .expect(status);

      expect(res.body).toMatchObject({
        statusCode: status,
        error: 'TEST_ERROR',
        message: `A ${kind} error`,
        path: `/things/domain/${kind}`,
      });
    });

    it('returns the same shape for an unknown route', async () => {
      const res = await request(app.getHttpServer())
        .get('/nope')
        .set('X-Correlation-Id', 'c-404')
        .expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        error: 'NOT_FOUND',
        path: '/nope',
        correlationId: 'c-404',
      });
    });

    it('maps a Postgres unique violation to 409', async () => {
      const res = await request(app.getHttpServer())
        .get('/things/duplicate')
        .expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        error: 'UNIQUE_VIOLATION',
      });
    });

    it('hides the details of an unexpected error behind a 500', async () => {
      const res = await request(app.getHttpServer())
        .get('/things/crash')
        .expect(500);

      expect(res.body).toMatchObject({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
      expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
    });
  });
});
