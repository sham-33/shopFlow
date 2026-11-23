import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

// A caller-supplied ID is accepted only if it is short and made of safe
// characters, so a client cannot push arbitrary text into our logs.
const VALID_CORRELATION_ID = /^[\w.:-]{1,128}$/;

interface CorrelationContext {
  correlationId: string;
}

type CorrelatedRequest = IncomingMessage & { correlationId?: string };

const storage = new AsyncLocalStorage<CorrelationContext>();

/** The correlation ID of the request or message being handled, if any. */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/**
 * Runs `fn` with `correlationId` as the current correlation ID. The HTTP
 * middleware uses it for requests; Kafka consumers will use it for messages.
 */
export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return storage.run({ correlationId }, fn);
}

/**
 * Returns the correlation ID for this request, choosing it on the first call:
 * the incoming X-Correlation-Id header when valid, otherwise a new UUID. The
 * ID is also sent back on the response.
 *
 * Both the correlation middleware and the HTTP logger call this, in whichever
 * order Nest runs them, and always get the same ID.
 */
export function resolveCorrelationId(req: IncomingMessage, res: ServerResponse): string {
  const request = req as CorrelatedRequest;
  if (request.correlationId) {
    return request.correlationId;
  }

  const header = req.headers[CORRELATION_ID_HEADER.toLowerCase()];
  const incoming = Array.isArray(header) ? header[0] : header;
  const correlationId = incoming && VALID_CORRELATION_ID.test(incoming) ? incoming : randomUUID();

  request.correlationId = correlationId;
  if (!res.headersSent) {
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
  }
  return correlationId;
}

/** The correlation ID already chosen for this request, if any. */
export function getRequestCorrelationId(req: IncomingMessage): string | undefined {
  return (req as CorrelatedRequest).correlationId;
}
