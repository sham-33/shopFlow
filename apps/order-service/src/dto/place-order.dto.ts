import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  COUPON_CODE_PATTERN,
  COUPON_CODE_PATTERN_MESSAGE,
  MAX_ITEMS_PER_ORDER,
  MAX_QUANTITY_PER_ITEM,
} from '../constants.js';
import { PaymentMethod } from '../domain/enums.js';
import { toUpperCase } from './transforms.js';

export class OrderLineDto {
  @ApiProperty({ format: 'uuid', example: '33444446-505d-4aaf-b42a-5cbc575a9783' })
  @IsUUID()
  public productId: string;

  @ApiProperty({
    description: 'Units of this product',
    example: 2,
    minimum: 1,
    maximum: MAX_QUANTITY_PER_ITEM,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY_PER_ITEM)
  public quantity: number;
}

/** Body of POST /api/v1/orders. Prices come from the catalog, never from the client. */
export class PlaceOrderDto {
  @ApiProperty({ format: 'uuid', example: '11111111-1111-4111-8111-111111111111' })
  @IsUUID()
  public customerId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.WALLET })
  @IsEnum(PaymentMethod)
  public paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'What to buy. Each product may appear once.',
    type: [OrderLineDto],
    minItems: 1,
    maxItems: MAX_ITEMS_PER_ORDER,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ITEMS_PER_ORDER)
  @ArrayUnique((line: OrderLineDto) => line.productId, {
    message: 'items must not list the same product twice',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  public items: OrderLineDto[];

  @ApiPropertyOptional({
    description: 'A coupon to apply. Matched without regard to case.',
    example: 'SAVE10',
    pattern: COUPON_CODE_PATTERN.source,
  })
  @IsOptional()
  @Transform(toUpperCase)
  @IsString()
  @Matches(COUPON_CODE_PATTERN, { message: COUPON_CODE_PATTERN_MESSAGE })
  public couponCode?: string;
}
