import { sqlIn } from '@app/common';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { OrderStatus } from '../domain/enums.js';
import { Order } from './order.entity.js';

/** Audit trail: one row for every status an order has been in. Rows are never updated. */
@Entity({ name: 'order_status_history' })
@Index('idx_order_status_history_order_id', ['orderId'])
@Check(
  'chk_order_status_history_from_status',
  `"from_status" IS NULL OR ${sqlIn('from_status', Object.values(OrderStatus))}`,
)
@Check('chk_order_status_history_to_status', sqlIn('to_status', Object.values(OrderStatus)))
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_order_status_history' })
  public id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  public orderId: string;

  @ManyToOne(() => Order, (order) => order.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id', foreignKeyConstraintName: 'fk_order_status_history_order' })
  public order?: Relation<Order>;

  /** Null for the first entry, when the order is created. */
  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  public fromStatus: OrderStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  public toStatus: OrderStatus;

  /** Why the status changed, for example "Payment declined: insufficient wallet balance". */
  @Column({ type: 'varchar', length: 200, nullable: true })
  public reason: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  public changedAt: Date;
}
