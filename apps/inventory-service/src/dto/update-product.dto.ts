import { IsBoolean, IsNumber, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { MAX_PRICE_RUPEES } from './product.constraints.js';

// ValidateIf(not undefined) instead of IsOptional: IsOptional would also let
// `null` through, and these columns cannot be null.
const isPresent = (_dto: object, value: unknown): boolean => value !== undefined;

/** Body of PATCH /api/v1/products/:id. Send only the fields to change. */
export class UpdateProductDto {
  @ValidateIf(isPresent)
  @IsString()
  @Length(1, 200)
  public name?: string;

  /** Price in rupees with at most 2 decimals. */
  @ValidateIf(isPresent)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_PRICE_RUPEES)
  public price?: number;

  @ValidateIf(isPresent)
  @IsBoolean()
  public active?: boolean;
}
