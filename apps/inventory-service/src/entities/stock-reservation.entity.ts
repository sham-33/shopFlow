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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ReservationStatus } from '../domain/enums.js';
import { Product } from './product.entity.js';

/**
 * Stock held for one line of an order. The units have already moved from the
 * product's `available_qty` to its `reserved_qty`; this row records which
 * order holds them, so they can be committed or released later.
 *
 * The unique (order, product) pair is a business guard: even if an
 * OrderCreated were handled twice, an order could never hold the same
 * product twice.
 */
@Entity({ name: 'stock_reservations' })
@Unique('uq_stock_reservations_order_product', ['orderId', 'productId'])
@Index('idx_stock_reservations_product_id', ['productId'])
@Check('chk_stock_reservations_quantity_positive', '"quantity" > 0')
@Check('chk_stock_reservations_status', sqlIn('status', Object.values(ReservationStatus)))
export class StockReservation {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_stock_reservations',
  })
  public id: string;

  /** The order in the order service. Not a foreign key: that table is in another database. */
  @Column({ name: 'order_id', type: 'uuid' })
  public orderId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  public productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'fk_stock_reservations_product',
  })
  public product?: Relation<Product>;

  @Column({ type: 'integer' })
  public quantity: number;

  @Column({ type: 'varchar', length: 20 })
  public status: ReservationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date;
}
