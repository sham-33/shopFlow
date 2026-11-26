import { isUniqueViolation } from '@app/common';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity.js';
import type { CouponRepository } from './coupon.repository.js';

@Injectable()
export class TypeOrmCouponRepository implements CouponRepository {
  constructor(private readonly dataSource: DataSource) {}

  public findByCode(code: string, manager?: EntityManager): Promise<Coupon | null> {
    return this.coupons(manager).findOneBy({ code });
  }

  public async insert(coupon: Coupon, manager?: EntityManager): Promise<Coupon | null> {
    try {
      // A savepoint inside a caller's transaction keeps that transaction usable if this fails.
      return await (manager ?? this.dataSource.manager).transaction((tx) =>
        tx.getRepository(Coupon).save(coupon),
      );
    } catch (error) {
      if (isUniqueViolation(error, 'uq_coupons_code')) {
        return null;
      }
      throw error;
    }
  }

  private coupons(manager?: EntityManager): Repository<Coupon> {
    return (manager ?? this.dataSource.manager).getRepository(Coupon);
  }
}
