import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ErrorResponseBody } from '../exceptions/all-exceptions.filter.js';

/** ErrorResponseBody as a class, so Swagger can describe error responses. */
export class ErrorResponseDto implements ErrorResponseBody {
  @ApiProperty({ description: 'HTTP status code', example: 404 })
  public statusCode: number;

  @ApiProperty({
    description:
      'Stable machine-readable error code. Clients should branch on this, never on the message.',
    example: 'PRODUCT_NOT_FOUND',
  })
  public code: string;

  @ApiProperty({ description: 'HTTP status text', example: 'Not Found' })
  public error: string;

  @ApiProperty({
    description: 'Human-readable message',
    example: 'Product not found',
  })
  public message: string;

  @ApiPropertyOptional({
    description: 'Extra information about this error, such as the IDs involved or invalid fields',
    type: 'object',
    additionalProperties: true,
    example: { productId: '33444446-505d-4aaf-b42a-5cbc575a9783' },
  })
  public details?: Record<string, unknown>;

  @ApiProperty({
    description: 'Path of the request',
    example: '/api/v1/products/33444446-505d-4aaf-b42a-5cbc575a9783',
  })
  public path: string;

  @ApiProperty({
    description: 'When the error happened (ISO 8601)',
    example: '2026-11-23T11:35:57.258Z',
  })
  public timestamp: string;

  @ApiPropertyOptional({
    description: 'Correlation ID of the request, also sent in the X-Correlation-Id header',
    example: 'c-91ab',
  })
  public correlationId?: string;
}
