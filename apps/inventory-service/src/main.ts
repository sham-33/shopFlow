import { setupApp } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // Hold startup logs until the pino logger is ready.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupApp(app, {
    title: 'Inventory Service',
    description:
      'Owns the product catalogue and stock levels. Reserves stock for new orders, releases it on cancellation and commits it on payment.',
  });
  await app.listen(process.env.PORT ?? 3002);
}

await bootstrap();
