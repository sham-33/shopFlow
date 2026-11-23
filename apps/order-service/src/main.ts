import { setupApp } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // Hold startup logs until the pino logger is ready.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupApp(app);
  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
