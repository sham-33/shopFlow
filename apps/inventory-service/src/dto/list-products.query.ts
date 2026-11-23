import { PaginationQueryDto } from '@app/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Query of GET /api/v1/products?search=&page=&limit= */
export class ListProductsQuery extends PaginationQueryDto {
  /** Matches anywhere in the name or SKU, ignoring case. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public search?: string;
}
