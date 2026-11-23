import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import { resolveCorrelationId } from '../correlation/correlation-id.js';

/**
 * nestjs-pino settings shared by every service.
 *
 * - JSON logs, one line each, named after the service. In a terminal outside
 *   production they are pretty-printed instead (needs the pino-pretty dev
 *   dependency).
 * - Each log line written while handling a request carries `correlationId`.
 * - Level comes from LOG_LEVEL (default `info`; `silent` under tests).
 */
export function createLoggerParams(serviceName: string): Params {
  const isProduction = process.env.NODE_ENV === 'production';
  const pretty = !isProduction && process.stdout.isTTY;

  return {
    pinoHttp: {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? defaultLevel(),
      genReqId: resolveCorrelationId,
      // Bind only the correlation ID to each request's log lines, not the
      // whole request object. The final "request completed" line still has
      // the request and response.
      quietReqLogger: true,
      customAttributeKeys: { reqId: 'correlationId' },
      customLogLevel: levelForResponse,
      // Kubernetes probes hit these every few seconds; logging them is noise.
      autoLogging: { ignore: (req) => req.url?.startsWith('/health/') ?? false },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      transport: pretty ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
    },
  };
}

function defaultLevel(): string {
  return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
}

function levelForResponse(
  _req: IncomingMessage,
  res: ServerResponse,
  error?: Error,
): 'info' | 'warn' | 'error' {
  if (error || res.statusCode >= 500) {
    return 'error';
  }
  return res.statusCode >= 400 ? 'warn' : 'info';
}
