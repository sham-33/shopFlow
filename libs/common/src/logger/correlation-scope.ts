import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CORRELATION_ID_LOG_FIELD, runWithCorrelationId } from '../correlation/correlation-id.js';

/**
 * Runs work that does not come from an HTTP request, such as a Kafka message,
 * under a correlation ID: `getCorrelationId()` returns it, so events written
 * inside carry it on, and every log line written inside carries it, the way
 * pino-http binds it for a request. One search for the ID then finds the
 * whole journey across services.
 */
@Injectable()
export class CorrelationScope {
  constructor(private readonly logger: PinoLogger) {}

  public run<T>(correlationId: string, work: () => T): T {
    return this.logger.runInContext(() => runWithCorrelationId(correlationId, work), {
      bindings: { [CORRELATION_ID_LOG_FIELD]: correlationId },
    });
  }
}
