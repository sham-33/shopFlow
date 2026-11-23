import { type INestApplication, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

/**
 * HTTP setup shared by every service's main.ts:
 * - pino becomes Nest's logger (pair with `bufferLogs: true` in NestFactory.create),
 * - routes live under /api/v<n>/..., with the version set on each controller
 *   (for example `@Controller({ path: 'products', version: '1' })`),
 * - shutdown hooks run on SIGTERM, so connections close cleanly.
 */
export function setupApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();
}
