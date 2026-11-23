import { PaginationQueryDto } from '@app/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Query of GET /api/v1/products?search=&page=&limit= */
export class ListProductsQuery extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Text to find anywhere in the name or SKU, ignoring case',
    example: 'shirt',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public search?: string;
}
