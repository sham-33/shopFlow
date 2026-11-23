import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  getCorrelationId,
  getRequestCorrelationId,
} from '../correlation/correlation-id.js';
import { DomainException, type DomainErrorKind } from './domain.exception.js';

/** The JSON body of every error response. */
export interface ErrorResponseBody {
  statusCode: number;
  /** Machine-readable code, for example `PRODUCT_NOT_FOUND` or `NOT_FOUND`. */
  error: string;
  message: string;
  details?: Record<string, unknown>;
  path: string;
  timestamp: string;
  correlationId?: string;
}

type ErrorDescription = Pick<
  ErrorResponseBody,
  'statusCode' | 'error' | 'message' | 'details'
>;

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  invalid_input: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  unprocessable: HttpStatus.UNPROCESSABLE_ENTITY,
};

const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * Turns every error thrown while handling an HTTP request into the same JSON
 * shape (`ErrorResponseBody`). Unknown errors become a 500 with a generic
 * message; their details go to the log only.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // Only HTTP is handled here. Kafka handlers get their own error handling
    // (retry and dead-letter topics) in libs/messaging.
    if (host.getType() !== 'http') {
      throw exception;
    }

    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const description = this.describe(exception);

    const body: ErrorResponseBody = {
      ...description,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      correlationId: getRequestCorrelationId(request) ?? getCorrelationId(),
    };

    response.status(body.statusCode).json(body);
  }

  private describe(exception: unknown): ErrorDescription {
    if (exception instanceof DomainException) {
      return {
        statusCode: STATUS_BY_KIND[exception.kind],
        error: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      if (statusCode >= 500) {
        this.logger.error(exception);
      }
      return {
        statusCode,
        error: HttpStatus[statusCode] ?? 'HTTP_ERROR',
        message: messageOf(exception),
      };
    }

    if (isUniqueViolation(exception)) {
      // The service should have checked for this (for example with a
      // DuplicateSkuException), so log it as a gap in the code.
      this.logger.warn(exception);
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'UNIQUE_VIOLATION',
        message: 'A record with the same unique value already exists',
      };
    }

    this.logger.error(exception);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }
}

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if ('message' in response) {
    const { message } = response;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return message.join('; ');
    }
  }
  return exception.message;
}

/**
 * True for a Postgres unique-constraint error. TypeORM's QueryFailedError
 * copies the driver's `code` onto itself and also keeps it on `driverError`.
 */
function isUniqueViolation(exception: unknown): boolean {
  if (!(exception instanceof Error)) {
    return false;
  }
  const { code, driverError } = exception as Error & {
    code?: unknown;
    driverError?: { code?: unknown };
  };
  return (
    code === POSTGRES_UNIQUE_VIOLATION ||
    driverError?.code === POSTGRES_UNIQUE_VIOLATION
  );
}
