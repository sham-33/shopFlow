import { IsInt, Max, Min } from 'class-validator';
import { MAX_STOCK_CHANGE } from './product.constraints.js';

/** Body of POST /api/v1/products/:id/restock. */
export class RestockProductDto {
  /** Units to add to the available stock. */
  @IsInt()
  @Min(1)
  @Max(MAX_STOCK_CHANGE)
  public quantity: number;
}
