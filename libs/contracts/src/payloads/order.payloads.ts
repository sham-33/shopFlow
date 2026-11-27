import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsISO4217CurrencyCode,
  IsUppercase,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsRupees } from '../decorators/is-rupees.decorator.js';
import { CancelReason, PaymentMethod } from '../enums.js';

// Payloads on Topic.ORDERS, written by the order service. Money is in rupees,
// as in the HTTP APIs; consumers convert it with rupeesToPaise().

/** Every event about one order names it. The order ID is also the Kafka message key. */
export abstract class OrderEventPayload {
  @IsUUID()
  public orderId: string;
}

export class OrderedItem {
  @IsUUID()
  public productId: string;

  @IsInt()
  @Min(1)
  public quantity: number;

  /** The price the customer was charged per unit, before any discount. */
  @IsRupees()
  public unitPrice: number;
}

/** A new PENDING order. The inventory service reserves its items, all or nothing. */
export class OrderCreatedPayload extends OrderEventPayload {
  @IsUUID()
  public customerId: string;

  /** Each product appears once. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: OrderedItem | null) => item?.productId, {
    message: 'items must not list the same product twice',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderedItem)
  public items: OrderedItem[];

  /** What the customer pays, after the discount. */
  @IsRupees()
  public totalAmount: number;

  @IsISO4217CurrencyCode()
  @IsUppercase()
  public currency: string;

  @IsEnum(PaymentMethod)
  public paymentMethod: PaymentMethod;
}

/** Stock is reserved: the payment service charges the customer. */
export class OrderPaymentRequestedPayload extends OrderEventPayload {
  @IsUUID()
  public customerId: string;

  @IsRupees()
  public amount: number;

  @IsISO4217CurrencyCode()
  @IsUppercase()
  public currency: string;

  @IsEnum(PaymentMethod)
  public paymentMethod: PaymentMethod;
}

/** Paid: the inventory service turns the reservation into a sale. */
export class OrderConfirmedPayload extends OrderEventPayload {}

/** The inventory service releases the stock; the payment service refunds the order if it was paid. */
export class OrderCancelledPayload extends OrderEventPayload {
  @IsEnum(CancelReason)
  public reason: CancelReason;
}
