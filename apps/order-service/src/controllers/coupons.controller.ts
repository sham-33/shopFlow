import { ApiErrorResponse, COMMON_ERRORS } from '@app/common';
import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ERRORS } from '../constants/errors.js';
import { CouponResponseDto } from '../dto/coupon-response.dto.js';
import { CreateCouponDto } from '../dto/create-coupon.dto.js';
import { toCouponResponse, toNewCoupon } from '../mappers/coupon.mapper.js';
import { CouponsService } from '../services/coupons.service.js';

/** HTTP only: validated DTO in, service call, response DTO out. */
@ApiTags('Coupons')
@ApiErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, COMMON_ERRORS.INTERNAL_ERROR)
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @ApiOperation({
    summary: 'Create a coupon',
    description:
      'Admin creates an active discount code. PERCENTAGE coupons need percentOff, FLAT coupons need amountOff, BOGO coupons need neither.',
  })
  @ApiCreatedResponse({ description: 'The coupon was created.', type: CouponResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.VALIDATION_FAILED)
  @ApiErrorResponse(HttpStatus.CONFLICT, ERRORS.DUPLICATE_COUPON)
  @Post()
  public async create(@Body() dto: CreateCouponDto): Promise<CouponResponseDto> {
    return toCouponResponse(await this.couponsService.create(toNewCoupon(dto)));
  }
}
