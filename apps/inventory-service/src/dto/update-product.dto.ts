import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { MAX_PRICE_RUPEES } from './product.constraints.js';

// ValidateIf(not undefined) instead of IsOptional: IsOptional would also let
// `null` through, and these columns cannot be null.
const isPresent = (_dto: object, value: unknown): boolean => value !== undefined;

/** Body of PATCH /api/v1/products/:id. Send only the fields to change. */
export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Display name',
    example: 'Red T-shirt (M), slim fit',
    minLength: 1,
    maxLength: 200,
  })
  @ValidateIf(isPresent)
  @IsString()
  @Length(1, 200)
  public name?: string;

  @ApiPropertyOptional({
    description: 'Price in rupees, with at most 2 decimals',
    example: 549,
    minimum: 0,
    maximum: MAX_PRICE_RUPEES,
  })
  @ValidateIf(isPresent)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_PRICE_RUPEES)
  public price?: number;

  @ApiPropertyOptional({
    description: 'Whether the product can be ordered. Inactive products stay in the catalogue.',
    example: false,
  })
  @ValidateIf(isPresent)
  @IsBoolean()
  public active?: boolean;
}
