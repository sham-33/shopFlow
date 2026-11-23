import { type INestApplication, RequestMethod, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { isSwaggerEnabled, setupSwagger, type SwaggerOptions } from '../swagger/setup-swagger.js';

/** Health probes stay outside /api, so Kubernetes probes use plain paths. */
export const HEALTH_PATHS = ['health/live', 'health/ready'];

export type SetupAppOptions = SwaggerOptions;

/**
 * HTTP setup shared by every service's main.ts:
 * - pino becomes Nest's logger (pair with `bufferLogs: true` in NestFactory.create),
 * - routes live under /api/v<n>/..., with the version set on each controller
 *   (for example `@Controller({ path: 'products', version: '1' })`), except the
 *   health probes at /health/live and /health/ready,
 * - Swagger UI at /docs, outside production (see isSwaggerEnabled),
 * - shutdown hooks run on SIGTERM, so connections close cleanly.
 */
export function setupApp(app: INestApplication, options: SetupAppOptions): void {
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api', {
    exclude: HEALTH_PATHS.map((path) => ({ path, method: RequestMethod.GET })),
  });
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  if (isSwaggerEnabled()) {
    setupSwagger(app, options);
  }
}
