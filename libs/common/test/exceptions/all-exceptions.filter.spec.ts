import {
  type ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { runWithCorrelationId } from '../../src/correlation/correlation-id.js';
import {
  AllExceptionsFilter,
  type ErrorResponseBody,
} from '../../src/exceptions/all-exceptions.filter.js';
import { type DomainErrorKind, DomainException } from '../../src/exceptions/domain.exception.js';
import { RequestValidationException } from '../../src/exceptions/request-validation.exception.js';

class TestException extends DomainException {
  constructor(kind: DomainErrorKind, details?: Record<string, unknown>) {
    super({ code: 'TEST_ERROR', kind, message: 'Test error' }, { details });
  }
}

const PATH = '/api/v1/things/1?expand=true';

/** A fake HTTP context: the filter only uses these parts of Express. */
function httpContext(request: Record<string, unknown> = { originalUrl: PATH }) {
  const response = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  response.status.mockReturnValue(response);
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  const sentBody = (): ErrorResponseBody => response.json.mock.calls[0]?.[0] as ErrorResponseBody;
  return { host, response, sentBody };
}

describe('DomainException', () => {
  it('names the error after its class and keeps the cause', () => {
    const cause = new Error('row locked');
    class LockedException extends DomainException {
      constructor() {
        super({ code: 'LOCKED', kind: 'conflict', message: 'Locked' }, { cause });
      }
    }

    const error = new LockedException();

    expect(error.name).toBe('LockedException');
    expect(error.cause).toBe(cause);
  });
});

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let logError: ReturnType<typeof vi.spyOn>;
  let logWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logWarn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('domain exceptions', () => {
    it.each([
      ['invalid_input', 400, 'Bad Request'],
      ['not_found', 404, 'Not Found'],
      ['conflict', 409, 'Conflict'],
      ['unprocessable', 422, 'Unprocessable Entity'],
    ] as const)('maps kind %s to %i %s', (kind, status, statusText) => {
      const { host, response, sentBody } = httpContext();

      filter.catch(new TestException(kind, { thingId: 't-1' }), host);

      expect(response.status).toHaveBeenCalledWith(status);
      expect(sentBody()).toEqual({
        statusCode: status,
        code: 'TEST_ERROR',
        error: statusText,
        message: 'Test error',
        details: { thingId: 't-1' },
        path: PATH,
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) as string,
      });
    });

    it('repeats the code in the X-Error-Code header', () => {
      const { host, response } = httpContext();

      filter.catch(new TestException('not_found'), host);

      expect(response.setHeader).toHaveBeenCalledWith('X-Error-Code', 'TEST_ERROR');
    });

    it('does not log them, because they are expected outcomes', () => {
      const { host } = httpContext();

      filter.catch(new TestException('conflict'), host);

      expect(logError).not.toHaveBeenCalled();
      expect(logWarn).not.toHaveBeenCalled();
    });

    it('sends the invalid fields of a validation error in details', () => {
      const { host, sentBody } = httpContext();
      const fields = [{ field: 'price', messages: ['price must not be less than 0'] }];

      filter.catch(new RequestValidationException(fields), host);

      expect(sentBody()).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        details: { fields },
      });
    });
  });

  describe("Nest's HTTP exceptions", () => {
    it('uses the status name as the code and keeps the message', () => {
      const { host, sentBody } = httpContext();

      filter.catch(new NotFoundException('Cannot GET /nope'), host);

      expect(sentBody()).toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        error: 'Not Found',
        message: 'Cannot GET /nope',
      });
      expect(sentBody().details).toBeUndefined();
    });

    it('accepts a plain string response', () => {
      const { host, sentBody } = httpContext();

      filter.catch(new HttpException('Slow down', 429), host);

      expect(sentBody()).toMatchObject({
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
        error: 'Too Many Requests',
        message: 'Slow down',
      });
    });

    it('joins a list of messages into one', () => {
      const { host, sentBody } = httpContext();

      filter.catch(new BadRequestException(['first problem', 'second problem']), host);

      expect(sentBody().message).toBe('first problem; second problem');
    });

    it('passes a non-standard body, such as a failed health check, on as details', () => {
      const { host, sentBody } = httpContext();
      const result = {
        status: 'error',
        error: { database: { status: 'down' } },
      };

      filter.catch(new ServiceUnavailableException(result), host);

      expect(sentBody()).toMatchObject({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service Unavailable',
        details: result,
      });
    });

    it('falls back to generic names for a status Node does not know', () => {
      const { host, sentBody } = httpContext();

      filter.catch(new HttpException('Client closed request', 499), host);

      expect(sentBody()).toMatchObject({
        statusCode: 499,
        code: 'HTTP_ERROR',
        error: 'Error',
      });
    });

    it('logs 5xx errors but not 4xx ones', () => {
      filter.catch(new BadRequestException('bad'), httpContext().host);
      expect(logError).not.toHaveBeenCalled();

      const unavailable = new ServiceUnavailableException();
      filter.catch(unavailable, httpContext().host);
      expect(logError).toHaveBeenCalledWith(unavailable);
    });
  });

  describe('database unique violations', () => {
    it.each([
      ['on the error itself', { code: '23505' }],
      ['on driverError only', { driverError: { code: '23505' } }],
    ])('returns 409 UNIQUE_VIOLATION when the Postgres code is %s', (_where, fields) => {
      const { host, sentBody } = httpContext();
      const error = Object.assign(new Error('duplicate key value'), fields);

      filter.catch(error, host);

      expect(sentBody()).toMatchObject({
        statusCode: 409,
        code: 'UNIQUE_VIOLATION',
        error: 'Conflict',
        message: 'A record with the same unique value already exists',
      });
      expect(logWarn).toHaveBeenCalledWith(error);
    });

    it('treats other database errors, such as a foreign-key violation, as a 500', () => {
      const { host, sentBody } = httpContext();

      filter.catch(Object.assign(new Error('violates foreign key'), { code: '23503' }), host);

      expect(sentBody().code).toBe('INTERNAL_ERROR');
    });
  });

  describe('unexpected errors', () => {
    it('returns a generic 500 and logs the real error', () => {
      const { host, sentBody } = httpContext();
      const error = new Error('password=hunter2 leaked in a driver message');

      filter.catch(error, host);

      expect(sentBody()).toMatchObject({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        error: 'Internal Server Error',
        message: 'Internal server error',
      });
      expect(JSON.stringify(sentBody())).not.toContain('hunter2');
      expect(logError).toHaveBeenCalledWith(error);
    });

    it('handles values that are not Error objects', () => {
      const { host, sentBody } = httpContext();

      filter.catch('a thrown string', host);

      expect(sentBody().code).toBe('INTERNAL_ERROR');
      expect(logError).toHaveBeenCalledWith('a thrown string');
    });
  });

  describe('correlation ID', () => {
    it('takes the ID chosen for the request', () => {
      const { host, sentBody } = httpContext({
        originalUrl: PATH,
        correlationId: 'c-request',
      });

      filter.catch(new TestException('not_found'), host);

      expect(sentBody().correlationId).toBe('c-request');
    });

    it('falls back to the ID of the current context', () => {
      const { host, sentBody } = httpContext();

      runWithCorrelationId('c-context', () => {
        filter.catch(new TestException('not_found'), host);
      });

      expect(sentBody().correlationId).toBe('c-context');
    });

    it('leaves it out when there is none', () => {
      const { host, sentBody } = httpContext();

      filter.catch(new TestException('not_found'), host);

      expect(sentBody().correlationId).toBeUndefined();
    });
  });

  it('rethrows anything outside HTTP, untouched, for the messaging layer to handle', () => {
    const error = new TestException('not_found');
    const { response } = httpContext();
    const rpcHost = { getType: () => 'rpc' } as unknown as ArgumentsHost;

    expect(() => filter.catch(error, rpcHost)).toThrow(error);
    expect(response.json).not.toHaveBeenCalled();
  });
});
