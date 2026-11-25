import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

/**
 * Kubernetes probes for a service with a database: GET /health/live and
 * GET /health/ready. Import it in the AppModule after DatabaseModule.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
