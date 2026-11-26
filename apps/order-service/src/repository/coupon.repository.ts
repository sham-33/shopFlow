import type { EntityManager } from 'typeorm';
import type { Coupon } from '../entities/coupon.entity.js';

export interface CouponRepository {
  /** The coupon with this code (upper case), or null. */
  findByCode(code: string, manager?: EntityManager): Promise<Coupon | null>;

  /** Inserts the coupon. Returns null, inserting nothing, when the code is already taken. */
  insert(coupon: Coupon, manager?: EntityManager): Promise<Coupon | null>;
}

/** Injection token for CouponRepository. */
export const COUPON_REPOSITORY = Symbol('COUPON_REPOSITORY');
