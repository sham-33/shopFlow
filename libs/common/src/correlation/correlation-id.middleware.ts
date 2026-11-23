import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  resolveCorrelationId,
  runWithCorrelationId,
} from './correlation-id.js';

/**
 * Gives every HTTP request a correlation ID and runs the rest of the request
 * inside it, so any code (services, the outbox, logs) can read it with
 * `getCorrelationId()`.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    runWithCorrelationId(resolveCorrelationId(req, res), next);
  }
}
