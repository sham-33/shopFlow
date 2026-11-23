import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CORRELATION_ID_HEADER } from '../correlation/correlation-id.js';

/** Swagger UI is served at /docs and the OpenAPI JSON at /docs-json. */
export const SWAGGER_PATH = 'docs';

export interface SwaggerOptions {
  /** Page title, for example "Inventory Service". */
  title: string;
  /** One or two sentences about what the service does. */
  description: string;
}

/**
 * Swagger is on outside production. SWAGGER_ENABLED=true or false overrides
 * that, for example to turn it on in a staging cluster.
 */
export function isSwaggerEnabled(): boolean {
  const flag = process.env.SWAGGER_ENABLED;
  if (flag !== undefined && flag !== '') {
    return flag === 'true';
  }
  return process.env.NODE_ENV !== 'production';
}

export function setupSwagger(app: INestApplication, { title, description }: SwaggerOptions): void {
  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion('1')
    .addGlobalParameters({
      in: 'header',
      name: CORRELATION_ID_HEADER,
      required: false,
      description:
        'Optional ID that ties together the logs and events of one request. Created if missing, and returned in the response header.',
      schema: { type: 'string', example: 'c-91ab' },
    })
    .build();

  SwaggerModule.setup(SWAGGER_PATH, app, SwaggerModule.createDocument(app, config));
}
