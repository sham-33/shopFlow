import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Which page of a list to return. Page numbers start at 1. */
export interface PageRequest {
  page: number;
  limit: number;
}

/**
 * `?page=&limit=` query parameters. Extend it for list endpoints that take
 * filters, for example `class ListProductsQuery extends PaginationQueryDto`.
 */
export class PaginationQueryDto implements PageRequest {
  @ApiPropertyOptional({ description: 'Page number, starting at 1', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  public limit: number = DEFAULT_PAGE_SIZE;
}

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/** PageMeta as a class, so Swagger can describe it in list responses. */
export class PageMetaDto implements PageMeta {
  @ApiProperty({ description: 'Page number, starting at 1', example: 1 })
  public page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  public limit: number;

  @ApiProperty({ description: 'Items matching the query across all pages', example: 42 })
  public totalItems: number;

  @ApiProperty({ description: 'Number of pages', example: 3 })
  public totalPages: number;
}

/** One page of results plus the numbers a client needs to page through. */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export function toPage<T>(items: T[], totalItems: number, { page, limit }: PageRequest): Page<T> {
  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

/** The `skip` and `take` values for a TypeORM `find` call. */
export function toSkipTake({ page, limit }: PageRequest): {
  skip: number;
  take: number;
} {
  return { skip: (page - 1) * limit, take: limit };
}
