import { paiseTransformer, sqlIn } from '@app/common';
import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CouponType } from '../domain/enums.js';

/**
 * A discount code. Each type uses its own column, so a percentage and an
 * amount are never mixed in one field: PERCENTAGE sets percent_off, FLAT sets
 * amount_off, and BOGO needs neither.
 */
@Entity({ name: 'coupons' })
@Unique('uq_coupons_code', ['code'])
@Check('chk_coupons_type', sqlIn('type', Object.values(CouponType)))
// Every branch says IS NOT NULL explicitly: a CHECK only rejects a row when its
// expression is false, and `NULL > 0` is NULL, not false.
@Check(
  'chk_coupons_discount',
  `("type" = 'PERCENTAGE' AND "percent_off" IS NOT NULL AND "percent_off" BETWEEN 1 AND 100 AND "amount_off" IS NULL)` +
    ` OR ("type" = 'FLAT' AND "amount_off" IS NOT NULL AND "amount_off" > 0 AND "percent_off" IS NULL)` +
    ` OR ("type" = 'BOGO' AND "percent_off" IS NULL AND "amount_off" IS NULL)`,
)
@Check('chk_coupons_min_order_amount_not_negative', '"min_order_amount" >= 0')
export class Coupon {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_coupons' })
  public id: string;

  /** What customers type, upper case, for example SAVE10. */
  @Column({ type: 'varchar', length: 20 })
  public code: string;

  @Column({ type: 'varchar', length: 10 })
  public type: CouponType;

  /** Whole percent off the subtotal, 1 to 100. PERCENTAGE coupons only. */
  @Column({ name: 'percent_off', type: 'smallint', nullable: true })
  public percentOff: number | null;

  /** Fixed amount off, in paise. FLAT coupons only. */
  @Column({
    name: 'amount_off',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: paiseTransformer,
  })
  public amountOffPaise: number | null;

  /** Smallest subtotal the coupon applies to, in paise. 0 means any order. */
  @Column({
    name: 'min_order_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: paiseTransformer,
  })
  public minOrderPaise: number;

  /** Null means the coupon never expires. */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  public expiresAt: Date | null;

  @Column({ type: 'boolean', default: true })
  public active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;
}
