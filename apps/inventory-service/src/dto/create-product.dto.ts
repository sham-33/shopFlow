import { IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import {
  MAX_PRICE_RUPEES,
  MAX_STOCK_CHANGE,
  SKU_PATTERN,
  SKU_PATTERN_MESSAGE,
} from './product.constraints.js';

/** Body of POST /api/v1/products. */
export class CreateProductDto {
  @IsString()
  @Length(2, 64)
  @Matches(SKU_PATTERN, { message: SKU_PATTERN_MESSAGE })
  public sku: string;
  @IsString()
  @Length(1, 200)
  public name: string;

  /** Price in rupees with at most 2 decimals, for example 499.5. */
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_PRICE_RUPEES)
  public price: number;

  /** Units in stock when the product is created. Defaults to 0. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK_CHANGE)
  public initialQuantity: number = 0;
}
