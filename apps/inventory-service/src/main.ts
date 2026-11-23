import { setupApp } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { API_DOCS, DEFAULT_PORT } from './constants.js';

async function bootstrap(): Promise<void> {
  // Hold startup logs until the pino logger is ready.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupApp(app, API_DOCS);
  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

await bootstrap();
