import {
  type DynamicModule,
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { CorrelationIdMiddleware } from './correlation/correlation-id.middleware.js';
import { AllExceptionsFilter } from './exceptions/all-exceptions.filter.js';
import { createLoggerParams } from './logger/logger.params.js';
import { createValidationPipe } from './validation/validation.pipe.js';

export interface CommonModuleOptions {
  /** Shown as `name` on every log line, for example `inventory-service`. */
  serviceName: string;
}

/**
 * Cross-cutting setup every service imports once, in its AppModule:
 * pino logging, correlation IDs, the global ValidationPipe and the global
 * exception filter.
 *
 * The pipe and filter are registered as providers (APP_PIPE, APP_FILTER)
 * rather than in main.ts, so tests that build the app from AppModule get
 * them too.
 */
@Module({})
export class CommonModule implements NestModule {
  static forRoot({ serviceName }: CommonModuleOptions): DynamicModule {
    return {
      module: CommonModule,
      imports: [LoggerModule.forRoot(createLoggerParams(serviceName))],
      providers: [
        { provide: APP_PIPE, useFactory: createValidationPipe },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
      exports: [LoggerModule],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
