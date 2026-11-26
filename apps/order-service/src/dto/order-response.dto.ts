import { type Page, PageMetaDto } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { CancelReason, OrderStatus, PaymentMethod } from '../domain/enums.js';

export class OrderLineResponseDto {
  @ApiProperty({ format: 'uuid', example: '33444446-505d-4aaf-b42a-5cbc575a9783' })
  public productId: string;

  @ApiProperty({ example: 'TSHIRT-RED-M' })
  public sku: string;

  @ApiProperty({
    description: 'Product name when the order was placed',
    example: 'Red T-shirt (M)',
  })
  public name: string;

  @ApiProperty({ example: 2 })
  public quantity: number;

  @ApiProperty({
    description: 'Price of one unit when the order was placed, in rupees',
    example: 499.5,
  })
  public unitPrice: number;

  @ApiProperty({ description: 'quantity × unitPrice, in rupees', example: 999 })
  public lineTotal: number;
}

export class StatusChangeDto {
  @ApiProperty({ enum: OrderStatus, nullable: true, description: 'Null for the first entry' })
  public from: OrderStatus | null;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  public to: OrderStatus;

  @ApiProperty({ type: String, nullable: true, example: 'Order placed' })
  public reason: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-11-26T10:15:00.000Z' })
  public at: string;
}

/** An order without its lines and history, as lists return it. */
export class OrderSummaryDto {
  @ApiProperty({ format: 'uuid', example: '0b5a1f9e-3c2d-4e8f-9a7b-6c5d4e3f2a1b' })
  public id: string;

  @ApiProperty({ format: 'uuid', example: '11111111-1111-4111-8111-111111111111' })
  public customerId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  public status: OrderStatus;

  @ApiProperty({ description: 'Sum of the line totals, in rupees', example: 999 })
  public subtotal: number;

  @ApiProperty({ description: 'Coupon discount, in rupees', example: 0 })
  public discount: number;

  @ApiProperty({ description: 'What the customer pays, in rupees', example: 999 })
  public total: number;

  @ApiProperty({ example: 'INR' })
  public currency: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.WALLET })
  public paymentMethod: PaymentMethod;

  @ApiProperty({ type: String, nullable: true, example: null })
  public couponCode: string | null;

  @ApiProperty({ enum: CancelReason, nullable: true, example: null })
  public cancelReason: CancelReason | null;

  @ApiProperty({ format: 'date-time', example: '2026-11-26T10:15:00.000Z' })
  public createdAt: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-26T10:15:00.000Z' })
  public updatedAt: string;
}

/** One order with its lines and status history. */
export class OrderResponseDto extends OrderSummaryDto {
  @ApiProperty({ type: [OrderLineResponseDto] })
  public items: OrderLineResponseDto[];

  @ApiProperty({
    type: [StatusChangeDto],
    description: 'Every status the order has been in, oldest first',
  })
  public history: StatusChangeDto[];
}

/** Response of GET /api/v1/orders. */
export class OrderPageResponseDto implements Page<OrderSummaryDto> {
  @ApiProperty({ type: [OrderSummaryDto] })
  public items: OrderSummaryDto[];

  @ApiProperty({ type: PageMetaDto })
  public meta: PageMetaDto;
}
