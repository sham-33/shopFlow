import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponsController } from '../controllers/coupons.controller.js';
import { Coupon } from '../entities/coupon.entity.js';
import { COUPON_REPOSITORY } from '../repository/coupon.repository.js';
import { TypeOrmCouponRepository } from '../repository/typeorm-coupon.repository.js';
import { CouponsService } from '../services/coupons.service.js';

/** The coupon API, and the coupon repository that placing an order reads. */
@Module({
  imports: [TypeOrmModule.forFeature([Coupon])],
  controllers: [CouponsController],
  providers: [CouponsService, { provide: COUPON_REPOSITORY, useClass: TypeOrmCouponRepository }],
  exports: [COUPON_REPOSITORY],
})
export class CouponsModule {}
