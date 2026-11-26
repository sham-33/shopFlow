import { DomainException } from '@app/common';
import { ERRORS } from '../constants/errors.js';
import type { OrderStatus } from '../domain/enums.js';

/** Thrown when an order is asked to make a status move that OrderStateMachine does not allow. */
export class InvalidOrderStateException extends DomainException {
  constructor(orderId: string, from: OrderStatus, to: OrderStatus) {
    super(ERRORS.INVALID_ORDER_STATE, { details: { orderId, from, to } });
  }
}
