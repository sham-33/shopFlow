import { paiseTransformer } from '@app/common';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Stock } from './stock.entity.js';

@Entity({ name: 'products' })
@Unique('uq_products_sku', ['sku'])
@Check('chk_products_price_not_negative', '"price" >= 0')
export class Product {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_products' })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Price in paise (₹1 = 100 paise). Stored as numeric(12,2) rupees. */
  @Column({
    name: 'price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: paiseTransformer,
  })
  pricePaise: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relation<> stops TypeScript from emitting a reference to Stock in the
  // decorator metadata, which would break on the circular ESM import.
  @OneToOne(() => Stock, (stock) => stock.product)
  stock?: Relation<Stock>;
}
