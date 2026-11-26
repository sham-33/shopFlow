import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinDate,
  ValidateIf,
} from 'class-validator';
import {
  COUPON_CODE_PATTERN,
  COUPON_CODE_PATTERN_MESSAGE,
  MAX_ORDER_AMOUNT_PAISE,
} from '../constants.js';
import { OnlyForCouponType } from '../decorators/only-for-coupon-type.decorator.js';
import { CouponType } from '../domain/enums.js';
import { toUpperCase } from './transforms.js';

const MAX_AMOUNT_RUPEES = MAX_ORDER_AMOUNT_PAISE / 100;

/** Body of POST /api/v1/coupons. */
export class CreateCouponDto {
  @ApiProperty({
    description: 'What customers type. Stored in upper case.',
    example: 'SAVE10',
    pattern: COUPON_CODE_PATTERN.source,
  })
  @Transform(toUpperCase)
  @IsString()
  @Matches(COUPON_CODE_PATTERN, {
    message: COUPON_CODE_PATTERN_MESSAGE.replace('couponCode', 'code'),
  })
  public code: string;

  @ApiProperty({ enum: CouponType, example: CouponType.PERCENTAGE })
  @IsEnum(CouponType)
  public type: CouponType;

  @ApiPropertyOptional({
    description:
      'Whole percent off the subtotal. Required for PERCENTAGE coupons, not allowed otherwise.',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @ValidateIf(
    (dto: CreateCouponDto) => dto.type === CouponType.PERCENTAGE || dto.percentOff !== undefined,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  @OnlyForCouponType(CouponType.PERCENTAGE)
  public percentOff?: number;

  @ApiPropertyOptional({
    description:
      'Rupees off the subtotal, at most 2 decimals. Required for FLAT coupons, not allowed otherwise.',
    example: 100,
    minimum: 0.01,
  })
  @ValidateIf((dto: CreateCouponDto) => dto.type === CouponType.FLAT || dto.amountOff !== undefined)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(MAX_AMOUNT_RUPEES)
  @OnlyForCouponType(CouponType.FLAT)
  public amountOff?: number;

  @ApiPropertyOptional({
    description: 'Smallest subtotal, in rupees, the coupon works on',
    example: 500,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_AMOUNT_RUPEES)
  public minOrderAmount: number = 0;

  @ApiPropertyOptional({
    description:
      'When the coupon stops working (ISO 8601, in the future). Leave out for no expiry.',
    format: 'date-time',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date(), { message: 'expiresAt must be in the future' })
  public expiresAt?: Date;
}
