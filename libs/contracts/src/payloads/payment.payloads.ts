import { IsString, IsUUID, Matches } from 'class-validator';
import { REASON_CODE_PATTERN, REASON_CODE_PATTERN_MESSAGE } from '../constants.js';
import { IsRupees } from '../decorators/is-rupees.decorator.js';
import { OrderEventPayload } from './order.payloads.js';

// Payloads on Topic.PAYMENTS, written by the payment service.

/** The customer was charged. */
export class PaymentCompletedPayload extends OrderEventPayload {
  @IsUUID()
  public paymentId: string;

  @IsRupees()
  public amount: number;
}

/** The charge was refused; the order service cancels the order. */
export class PaymentFailedPayload extends OrderEventPayload {
  /** Why, as a code chosen by the payment service, for example INSUFFICIENT_BALANCE. */
  @IsString()
  @Matches(REASON_CODE_PATTERN, { message: REASON_CODE_PATTERN_MESSAGE })
  public reason: string;
}

/** A cancelled order's payment was returned to the customer. */
export class PaymentRefundedPayload extends OrderEventPayload {
  @IsUUID()
  public paymentId: string;

  @IsRupees()
  public amount: number;
}
