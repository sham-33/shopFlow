import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options } from 'pino-http';
import { createLoggerParams } from '../../src/logger/logger.params.js';

function pinoHttpOptions(): Options {
  return createLoggerParams('inventory-service').pinoHttp as Options;
}

function levelFor(statusCode: number, error?: Error): string | undefined {
  const res = { statusCode } as ServerResponse;
  return pinoHttpOptions().customLogLevel?.({} as IncomingMessage, res, error);
}

describe('createLoggerParams', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('names every log line after the service', () => {
    expect(pinoHttpOptions().name).toBe('inventory-service');
  });

  it.each([
    [200, 'info'],
    [201, 'info'],
    [404, 'warn'],
    [409, 'warn'],
    [500, 'error'],
    [503, 'error'],
  ])('logs a %i response at %s', (status, level) => {
    expect(levelFor(status)).toBe(level);
  });

  it('logs at error when the request failed with an error, whatever the status', () => {
    expect(levelFor(200, new Error('socket hang up'))).toBe('error');
  });

  it('skips the request log for health probes only', () => {
    const { autoLogging } = pinoHttpOptions();
    const ignore = typeof autoLogging === 'object' ? autoLogging.ignore : undefined;

    expect(ignore?.({ url: '/health/live' } as IncomingMessage)).toBe(true);
    expect(ignore?.({ url: '/health/ready' } as IncomingMessage)).toBe(true);
    expect(ignore?.({ url: '/api/v1/products' } as IncomingMessage)).toBe(false);
  });

  describe('level', () => {
    it('is silent under tests by default', () => {
      vi.stubEnv('LOG_LEVEL', undefined);

      expect(pinoHttpOptions().level).toBe('silent');
    });

    it('is info elsewhere by default', () => {
      vi.stubEnv('LOG_LEVEL', undefined);
      vi.stubEnv('NODE_ENV', 'production');

      expect(pinoHttpOptions().level).toBe('info');
    });

    it('follows LOG_LEVEL', () => {
      vi.stubEnv('LOG_LEVEL', 'debug');

      expect(pinoHttpOptions().level).toBe('debug');
    });

    it('ignores an empty LOG_LEVEL, which pino would reject', () => {
      vi.stubEnv('LOG_LEVEL', '');
      vi.stubEnv('NODE_ENV', 'production');

      expect(pinoHttpOptions().level).toBe('info');
    });
  });

  it('hides auth headers and cookies from the request log', () => {
    expect(pinoHttpOptions().redact).toEqual(['req.headers.authorization', 'req.headers.cookie']);
  });
});
