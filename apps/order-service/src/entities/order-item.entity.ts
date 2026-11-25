import { paiseTransformer } from '@app/common';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Order } from './order.entity.js';

/**
 * One line of an order. SKU, name and price are copied from the local product
 * catalog when the order is placed, so later product changes never alter it.
 */
@Entity({ name: 'order_items' })
@Index('idx_order_items_order_id', ['orderId'])
@Check('chk_order_items_quantity_positive', '"quantity" > 0')
@Check('chk_order_items_unit_price_not_negative', '"unit_price" >= 0')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_order_items' })
  public id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  public orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id', foreignKeyConstraintName: 'fk_order_items_order' })
  public order?: Relation<Order>;

  @Column({ name: 'product_id', type: 'uuid' })
  public productId: string;

  @Column({ type: 'varchar', length: 64 })
  public sku: string;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  public productName: string;

  @Column({ type: 'integer' })
  public quantity: number;

  /** Price of one unit when the order was placed, in paise. */
  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: paiseTransformer,
  })
  public unitPricePaise: number;
}
