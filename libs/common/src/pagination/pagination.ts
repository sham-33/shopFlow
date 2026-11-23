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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/** One page of results plus the numbers a client needs to page through. */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export function toPage<T>(
  items: T[],
  totalItems: number,
  { page, limit }: PageRequest,
): Page<T> {
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
