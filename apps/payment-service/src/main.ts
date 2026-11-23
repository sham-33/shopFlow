import { setupApp } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // Hold startup logs until the pino logger is ready.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupApp(app, {
    title: 'Payment Service',
    description: 'Charges customers, refunds cancelled orders and creates invoice PDFs.',
  });
  await app.listen(process.env.PORT ?? 3003);
}

await bootstrap();
