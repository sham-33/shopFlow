import { type Page, type PageRequest, toPage } from '@app/common';
import { Inject, Injectable } from '@nestjs/common';
import { ORDER_CURRENCY, STATUS_CHANGE_REASONS } from '../constants.js';
import { couponRejection, CouponRejection } from '../domain/coupon-rules.js';
import { DiscountStrategyFactory } from '../domain/discounts/discount-strategy.factory.js';
import { CancelReason, OrderStatus, type PaymentMethod } from '../domain/enums.js';
import { calculateSubtotal } from '../domain/order-pricing.js';
import { OrderStateMachine } from '../domain/order-state-machine.js';
import type { CatalogProduct } from '../entities/catalog-product.entity.js';
import type { Coupon } from '../entities/coupon.entity.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { OrderStatusHistory } from '../entities/order-status-history.entity.js';
import { Order } from '../entities/order.entity.js';
import { IdempotencyKeyReusedException } from '../exceptions/idempotency-key-reused.exception.js';
import { InactiveProductsException } from '../exceptions/inactive-products.exception.js';
import { InvalidCouponException } from '../exceptions/invalid-coupon.exception.js';
import { OrderChangedConcurrentlyException } from '../exceptions/order-changed-concurrently.exception.js';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception.js';
import { UnknownProductsException } from '../exceptions/unknown-products.exception.js';
import { CATALOG_REPOSITORY, type CatalogRepository } from '../repository/catalog.repository.js';
import { COUPON_REPOSITORY, type CouponRepository } from '../repository/coupon.repository.js';
import {
  ORDER_REPOSITORY,
  type OrderFilter,
  type OrderRepository,
} from '../repository/order.repository.js';

export interface OrderLine {
  productId: string;
  quantity: number;
}

/** Everything needed to place an order. Product IDs in `items` are unique. */
export interface PlaceOrder {
  customerId: string;
  paymentMethod: PaymentMethod;
  items: OrderLine[];
  /** Upper case, or null for no coupon. */
  couponCode: string | null;
  /** The client's Idempotency-Key: placing the same request twice returns the first order. */
  idempotencyKey: string;
}

export interface PlacedOrder {
  order: Order;
  /** True when the order already existed for this Idempotency-Key and nothing new was created. */
  replayed: boolean;
}

/**
 * Business rules for orders. Knows nothing about HTTP; works with money in
 * paise. Events arrive with the outbox in Week 3.
 */
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository,
    @Inject(COUPON_REPOSITORY) private readonly coupons: CouponRepository,
    private readonly stateMachine: OrderStateMachine,
    private readonly discounts: DiscountStrategyFactory,
  ) {}

  /**
   * Places a PENDING order, priced from the local product catalog, with an
   * optional coupon. Safe to retry: the same Idempotency-Key returns the first
   * order instead of a new one.
   */
  public async place(request: PlaceOrder): Promise<PlacedOrder> {
    const earlier = await this.orders.findByIdempotencyKey(request.idempotencyKey);
    if (earlier) {
      return this.replay(earlier, request);
    }

    const saved = await this.orders.insert(await this.buildOrder(request));
    if (saved) {
      return { order: saved, replayed: false };
    }

    // A retry with the same key was inserted between our check and our insert.
    const winner = await this.orders.findByIdempotencyKey(request.idempotencyKey);
    if (!winner) {
      throw new Error(
        `Insert reported the Idempotency-Key ${request.idempotencyKey} as taken, but no order has it`,
      );
    }
    return this.replay(winner, request);
  }

  public async getById(orderId: string): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new OrderNotFoundException(orderId);
    }
    return order;
  }

  public async list(filter: OrderFilter, page: PageRequest): Promise<Page<Order>> {
    const { items, totalItems } = await this.orders.list(filter, page);
    return toPage(items, totalItems, page);
  }

  /**
   * The customer cancels the order. Allowed from PENDING, AWAITING_PAYMENT
   * and CONFIRMED; the other services then release the stock and refund a
   * paid order (Week 3–4).
   */
  public async cancel(orderId: string): Promise<Order> {
    const order = await this.getById(orderId);
    this.stateMachine.assertCanMove(order.id, order.status, OrderStatus.CANCELLED);

    const changed = await this.orders.changeStatus(order.id, order.version, order.status, {
      to: OrderStatus.CANCELLED,
      cancelReason: CancelReason.CUSTOMER_REQUEST,
      reason: STATUS_CHANGE_REASONS.CANCELLED_BY_CUSTOMER,
    });
    if (!changed) {
      throw new OrderChangedConcurrentlyException(order.id);
    }
    return this.getById(order.id);
  }

  private replay(existing: Order, request: PlaceOrder): PlacedOrder {
    if (!isSameRequest(existing, request)) {
      throw new IdempotencyKeyReusedException(request.idempotencyKey, existing.id);
    }
    return { order: existing, replayed: true };
  }

  private async buildOrder(request: PlaceOrder): Promise<Order> {
    const productIds = request.items.map(({ productId }) => productId);
    const products = new Map(
      (await this.catalog.findByIds(productIds)).map((product) => [product.productId, product]),
    );

    const unknown = productIds.filter((id) => !products.has(id));
    if (unknown.length > 0) {
      throw new UnknownProductsException(unknown);
    }
    const inactive = productIds.filter((id) => products.get(id)?.active === false);
    if (inactive.length > 0) {
      throw new InactiveProductsException(inactive);
    }

    const items = request.items.map(({ productId, quantity }) =>
      toOrderItem(products.get(productId) as CatalogProduct, quantity),
    );
    const subtotalPaise = calculateSubtotal(items);
    const coupon = await this.usableCoupon(request.couponCode, subtotalPaise);
    const discountPaise = this.discounts
      .forCoupon(coupon)
      .discountFor(subtotalPaise, items, coupon);

    return Object.assign(new Order(), {
      customerId: request.customerId,
      status: OrderStatus.PENDING,
      subtotalPaise,
      discountPaise,
      totalPaise: subtotalPaise - discountPaise,
      currency: ORDER_CURRENCY,
      paymentMethod: request.paymentMethod,
      couponCode: coupon?.code ?? null,
      cancelReason: null,
      idempotencyKey: request.idempotencyKey,
      items,
      statusHistory: [
        Object.assign(new OrderStatusHistory(), {
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          reason: STATUS_CHANGE_REASONS.PLACED,
        }),
      ],
    });
  }

  /** The coupon for this code if it can be used on this subtotal now; null for no code. */
  private async usableCoupon(code: string | null, subtotalPaise: number): Promise<Coupon | null> {
    if (code === null) {
      return null;
    }
    const coupon = await this.coupons.findByCode(code);
    if (!coupon) {
      throw new InvalidCouponException(code, CouponRejection.NOT_FOUND);
    }
    const rejection = couponRejection(coupon, subtotalPaise, new Date());
    if (rejection) {
      throw new InvalidCouponException(code, rejection);
    }
    return coupon;
  }
}

/** Copies the product's SKU, name and price into the order: later changes to the product never alter it. */
function toOrderItem(product: CatalogProduct, quantity: number): OrderItem {
  return Object.assign(new OrderItem(), {
    productId: product.productId,
    sku: product.sku,
    productName: product.name,
    quantity,
    unitPricePaise: product.pricePaise,
  });
}

/** Same customer, payment method, coupon and product quantities, ignoring the order of the lines. */
function isSameRequest(existing: Order, request: PlaceOrder): boolean {
  const lines = (items: readonly OrderLine[]): string =>
    items
      .map(({ productId, quantity }) => `${productId}:${quantity}`)
      .sort()
      .join(',');
  return (
    existing.customerId === request.customerId &&
    existing.paymentMethod === request.paymentMethod &&
    existing.couponCode === request.couponCode &&
    lines(existing.items ?? []) === lines(request.items)
  );
}
