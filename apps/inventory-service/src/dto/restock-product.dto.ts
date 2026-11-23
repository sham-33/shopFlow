import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_STOCK_CHANGE } from './product.constraints.js';

/** Body of POST /api/v1/products/:id/restock. */
export class RestockProductDto {
  @ApiProperty({
    description: 'Units to add to the available stock',
    example: 5,
    minimum: 1,
    maximum: MAX_STOCK_CHANGE,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_STOCK_CHANGE)
  public quantity: number;
}
