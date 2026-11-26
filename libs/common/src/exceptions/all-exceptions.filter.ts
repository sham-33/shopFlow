import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { getCorrelationId, getRequestCorrelationId } from '../correlation/correlation-id.js';
import { isUniqueViolation } from '../database/postgres-errors.js';
import { COMMON_ERRORS } from './common-errors.js';
import { DomainException, type DomainErrorKind } from './domain.exception.js';

/** The JSON body of every error response. */
export interface ErrorResponseBody {
  statusCode: number;
  /** Stable machine-readable code, for example `PRODUCT_NOT_FOUND`. Clients branch on this. */
  code: string;
  /** HTTP status text, for example `Not Found`. */
  error: string;
  message: string;
  /** Extra information, for example `{ productId }` or the invalid fields. */
  details?: Record<string, unknown>;
  path: string;
  timestamp: string;
  correlationId?: string;
}

/** Response header that repeats the error code, so it shows up in access logs. */
export const ERROR_CODE_HEADER = 'X-Error-Code';

type ErrorDescription = Pick<ErrorResponseBody, 'statusCode' | 'code' | 'message' | 'details'>;

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  invalid_input: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  unprocessable: HttpStatus.UNPROCESSABLE_ENTITY,
};

/**
 * Turns every error thrown while handling an HTTP request into the same JSON
 * shape (`ErrorResponseBody`). Unknown errors become a 500 with a generic
 * message; their details go to the log only.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    // Only HTTP is handled here. Kafka handlers get their own error handling
    // (retry and dead-letter topics) in libs/messaging.
    if (host.getType() !== 'http') {
      throw exception;
    }

    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { statusCode, code, message, details } = this.describe(exception);

    const body: ErrorResponseBody = {
      statusCode,
      code,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message,
      details,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      correlationId: getRequestCorrelationId(request) ?? getCorrelationId(),
    };

    response.setHeader(ERROR_CODE_HEADER, code);
    response.status(statusCode).json(body);
  }

  private describe(exception: unknown): ErrorDescription {
    if (exception instanceof DomainException) {
      return {
        statusCode: STATUS_BY_KIND[exception.kind],
        code: exception.code,
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
        // Nest's own errors (unknown route, bad UUID, …) use the status name as their code.
        code: HttpStatus[statusCode] ?? 'HTTP_ERROR',
        message: messageOf(exception),
        details: detailsOf(exception),
      };
    }

    if (isUniqueViolation(exception)) {
      // The service should have checked for this (for example with a
      // DuplicateSkuException), so log it as a gap in the code.
      this.logger.warn(exception);
      return {
        statusCode: HttpStatus.CONFLICT,
        ...COMMON_ERRORS.UNIQUE_VIOLATION,
      };
    }

    this.logger.error(exception);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      ...COMMON_ERRORS.INTERNAL_ERROR,
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
  return STATUS_CODES[exception.getStatus()] ?? exception.message;
}

/**
 * Nest's own exceptions carry `{ statusCode, message, error }`, which the body
 * already covers. Any other object (for example Terminus's result of a failed
 * health check) is passed on as `details`.
 */
function detailsOf(exception: HttpException): Record<string, unknown> | undefined {
  const response = exception.getResponse();
  if (typeof response === 'string' || 'message' in response) {
    return undefined;
  }
  return response as Record<string, unknown>;
}
