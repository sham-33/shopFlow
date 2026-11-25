import { paiseTransformer } from '@app/common';
import { Check, Column, Entity, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * The order service's own read-only copy of a product, kept up to date from
 * ProductUpdated events (Week 3). Orders check prices and names here, so they
 * never call the inventory service, and still work when it is down.
 */
@Entity({ name: 'product_catalog' })
@Unique('uq_product_catalog_sku', ['sku'])
@Check('chk_product_catalog_price_not_negative', '"price" >= 0')
export class CatalogProduct {
  /** Same ID as the product in the inventory service. */
  @PrimaryColumn({
    name: 'product_id',
    type: 'uuid',
    primaryKeyConstraintName: 'pk_product_catalog',
  })
  public productId: string;

  @Column({ type: 'varchar', length: 64 })
  public sku: string;

  @Column({ type: 'varchar', length: 200 })
  public name: string;

  @Column({
    name: 'price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: paiseTransformer,
  })
  public pricePaise: number;

  @Column({ type: 'boolean' })
  public active: boolean;

  /** When this copy last changed. */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date;
}
