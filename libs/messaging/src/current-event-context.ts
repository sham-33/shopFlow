import { getCorrelationId } from '@app/common';
import type { EventContext } from '@app/contracts';
import { randomUUID } from 'node:crypto';

/**
 * The context for an event written by an HTTP request: it continues the
 * request's correlation ID. Outside a request (a scheduled job) it starts a new
 * journey. For an event written while handling another event, use `causedBy()`.
 */
export function currentEventContext(): EventContext {
  return { correlationId: getCorrelationId() ?? randomUUID(), causationId: null };
}
