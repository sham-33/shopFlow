import { ApiProperty } from '@nestjs/swagger';
import { CouponType } from '../domain/enums.js';

export class CouponResponseDto {
  @ApiProperty({ format: 'uuid', example: 'c0c0c0c0-0000-4000-8000-000000000001' })
  public id: string;

  @ApiProperty({ example: 'SAVE10' })
  public code: string;

  @ApiProperty({ enum: CouponType, example: CouponType.PERCENTAGE })
  public type: CouponType;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'PERCENTAGE coupons only',
    example: 10,
  })
  public percentOff: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Rupees, FLAT coupons only',
    example: null,
  })
  public amountOff: number | null;

  @ApiProperty({ description: 'Smallest subtotal the coupon works on, in rupees', example: 0 })
  public minOrderAmount: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-12-31T23:59:59.000Z',
  })
  public expiresAt: string | null;

  @ApiProperty({ example: true })
  public active: boolean;

  @ApiProperty({ format: 'date-time', example: '2026-11-26T10:00:00.000Z' })
  public createdAt: string;
}
