import type { PageRequest } from '@app/common';
import type { EntityManager } from 'typeorm';
import type { CancelReason, OrderStatus } from '../domain/enums.js';
import type { Order } from '../entities/order.entity.js';

export interface OrderFilter {
  customerId?: string;
  status?: OrderStatus;
}

export interface StatusChange {
  to: OrderStatus;
  /** Recorded in order_status_history, for example "Cancelled by the customer". */
  reason: string;
  /** Set only when cancelling. */
  cancelReason?: CancelReason;
}

/**
 * Database access for orders. Every method takes an optional EntityManager so
 * a caller can add more work (an outbox event, in Week 3) to the same
 * transaction.
 */
export interface OrderRepository {
  /** The order with its items (by SKU) and status history (oldest first), or null. */
  findById(id: string, manager?: EntityManager): Promise<Order | null>;

  /** The order placed with this Idempotency-Key, with its items and history, or null. */
  findByIdempotencyKey(key: string, manager?: EntityManager): Promise<Order | null>;

  /** One page of orders, newest first, without items or history. */
  list(filter: OrderFilter, page: PageRequest): Promise<{ items: Order[]; totalItems: number }>;

  /**
   * Inserts the order with its items and history: all or nothing. Returns
   * null, inserting nothing, when another order already has the same
   * Idempotency-Key (two retries raced each other).
   */
  insert(order: Order, manager?: EntityManager): Promise<Order | null>;

  /**
   * Moves the order to a new status and records the move in its history, in
   * one transaction, but only if the order still has `expectedVersion`.
   * Returns false, changing nothing, when someone else updated it first.
   *
   * TypeORM's save() does not check @VersionColumn, so this is the one way to
   * change an order's status safely.
   */
  changeStatus(
    orderId: string,
    expectedVersion: number,
    from: OrderStatus,
    change: StatusChange,
    manager?: EntityManager,
  ): Promise<boolean>;
}

/** Injection token for OrderRepository. */
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
