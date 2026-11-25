import { paiseTransformer, sqlIn } from '@app/common';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { CancelReason, OrderStatus, PaymentMethod } from '../domain/enums.js';
import { OrderItem } from './order-item.entity.js';
import { OrderStatusHistory } from './order-status-history.entity.js';

/** Money columns: numeric(12,2) rupees in the database, whole paise in code. */
const MONEY = { type: 'numeric', precision: 12, scale: 2, transformer: paiseTransformer } as const;

@Entity({ name: 'orders' })
@Unique('uq_orders_idempotency_key', ['idempotencyKey'])
@Index('idx_orders_customer_id_created_at', ['customerId', 'createdAt'])
@Check('chk_orders_status', sqlIn('status', Object.values(OrderStatus)))
@Check('chk_orders_payment_method', sqlIn('payment_method', Object.values(PaymentMethod)))
@Check(
  'chk_orders_cancel_reason',
  `"cancel_reason" IS NULL OR ${sqlIn('cancel_reason', Object.values(CancelReason))}`,
)
// The total is always the subtotal minus a discount that never exceeds it.
@Check(
  'chk_orders_amounts',
  '"subtotal" >= 0 AND "discount_amount" >= 0 AND "discount_amount" <= "subtotal" AND "total_amount" = "subtotal" - "discount_amount"',
)
export class Order {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_orders' })
  public id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  public customerId: string;

  @Column({ type: 'varchar', length: 20 })
  public status: OrderStatus;

  /** Sum of quantity × unit price over the items, in paise. */
  @Column({ name: 'subtotal', ...MONEY })
  public subtotalPaise: number;

  @Column({ name: 'discount_amount', ...MONEY })
  public discountPaise: number;

  /** What the customer pays: subtotal minus discount, in paise. */
  @Column({ name: 'total_amount', ...MONEY })
  public totalPaise: number;

  @Column({ type: 'char', length: 3 })
  public currency: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 10 })
  public paymentMethod: PaymentMethod;

  /** The coupon applied, as typed by the customer. A copy: coupons can change later. */
  @Column({ name: 'coupon_code', type: 'varchar', length: 20, nullable: true })
  public couponCode: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 30, nullable: true })
  public cancelReason: CancelReason | null;

  /** The client's Idempotency-Key header. A repeated request returns this order instead of a new one. */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 100 })
  public idempotencyKey: string;

  /** Optimistic locking: an update based on an old version fails instead of overwriting. */
  @VersionColumn({ type: 'integer' })
  public version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  public items?: Relation<OrderItem>[];

  @OneToMany(() => OrderStatusHistory, (entry) => entry.order, { cascade: ['insert'] })
  public statusHistory?: Relation<OrderStatusHistory>[];
}
