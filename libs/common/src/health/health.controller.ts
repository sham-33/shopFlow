import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  type HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { COMMON_ERRORS } from '../exceptions/common-errors.js';
import { ApiErrorResponse } from '../swagger/api-error-response.decorator.js';

/** Longest the readiness probe waits for the database before reporting it down. */
export const READINESS_DATABASE_TIMEOUT_MS = 1500;

/**
 * Kubernetes probes. Served at /health/live and /health/ready, outside the
 * /api prefix, and left out of the request log.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns 200 while the process is running. Kubernetes restarts the pod if it fails.',
  })
  @HealthCheck()
  @Get('live')
  public live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 when the service can reach its database, 503 when it cannot. Kubernetes only sends traffic to ready pods.',
  })
  @ApiErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, COMMON_ERRORS.SERVICE_UNAVAILABLE)
  @HealthCheck()
  @Get('ready')
  public ready(): Promise<HealthCheckResult> {
    return this.health.check([
      this.database.pingCheck('database').withTimeout(READINESS_DATABASE_TIMEOUT_MS),
    ]);
  }
}
