import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import {
  MAX_PRICE_RUPEES,
  MAX_STOCK_CHANGE,
  SKU_PATTERN,
  SKU_PATTERN_MESSAGE,
} from './product.constraints.js';

/** Body of POST /api/v1/products. */
export class CreateProductDto {
  @ApiProperty({
    description:
      'Unique product code: A-Z, 0-9 and hyphens, not starting with a hyphen. Cannot change later.',
    example: 'TSHIRT-RED-M',
    minLength: 2,
    maxLength: 64,
    pattern: SKU_PATTERN.source,
  })
  @IsString()
  @Length(2, 64)
  @Matches(SKU_PATTERN, { message: SKU_PATTERN_MESSAGE })
  public sku: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Red T-shirt (M)',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  public name: string;

  @ApiProperty({
    description: 'Price in rupees, with at most 2 decimals',
    example: 499.5,
    minimum: 0,
    maximum: MAX_PRICE_RUPEES,
  })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_PRICE_RUPEES)
  public price: number;

  @ApiPropertyOptional({
    description: 'Units in stock when the product is created',
    example: 10,
    default: 0,
    minimum: 0,
    maximum: MAX_STOCK_CHANGE,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK_CHANGE)
  public initialQuantity: number = 0;
}
