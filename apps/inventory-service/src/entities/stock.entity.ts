import {
  Check,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  type Relation,
  VersionColumn,
} from 'typeorm';
import { Product } from './product.entity.js';

/**
 * Stock level of one product. `available_qty` can be sold; `reserved_qty` is
 * held for orders waiting for payment.
 *
 * The CHECK constraints are a last line of defence against overselling: even
 * a buggy update can never push either quantity below zero.
 */
@Entity({ name: 'stock' })
@Check('chk_stock_available_qty_not_negative', '"available_qty" >= 0')
@Check('chk_stock_reserved_qty_not_negative', '"reserved_qty" >= 0')
export class Stock {
  @PrimaryColumn({
    name: 'product_id',
    type: 'uuid',
    primaryKeyConstraintName: 'pk_stock',
  })
  productId: string;

  @OneToOne(() => Product, (product) => product.stock, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'fk_stock_product',
  })
  product?: Relation<Product>;

  @Column({ name: 'available_qty', type: 'integer', default: 0 })
  availableQty: number;

  @Column({ name: 'reserved_qty', type: 'integer', default: 0 })
  reservedQty: number;

  @VersionColumn({ type: 'integer' })
  version: number;
}
