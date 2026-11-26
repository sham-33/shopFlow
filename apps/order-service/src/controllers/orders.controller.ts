import { ApiErrorResponse, COMMON_ERRORS, ParseIdPipe } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENT_REPLAYED_HEADER,
  ORDER_ID_PARAM,
} from '../constants.js';
import { ERRORS } from '../constants/errors.js';
import { IdempotencyKey } from '../decorators/idempotency-key.decorator.js';
import { ListOrdersQuery } from '../dto/list-orders.query.js';
import { OrderPageResponseDto, OrderResponseDto } from '../dto/order-response.dto.js';
import { PlaceOrderDto } from '../dto/place-order.dto.js';
import { toOrderResponse, toOrderSummary, toPlaceOrder } from '../mappers/order.mapper.js';
import { OrdersService } from '../services/orders.service.js';

/** HTTP only: validated DTO in, service call, response DTO out. */
@ApiTags('Orders')
@ApiErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, COMMON_ERRORS.INTERNAL_ERROR)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary: 'Place an order',
    description:
      'Saves a PENDING order priced from the local product catalog. Send a unique Idempotency-Key with each new order: repeating a request with the same key returns the first order (with Idempotent-Replayed: true) instead of creating another.',
  })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description: 'Unique per order, for example a UUID. Up to 100 letters, digits, _ . : or -.',
    schema: { type: 'string', example: '5f0c8a2e-1b7d-4c3a-9e21-0d4f6a7b8c90' },
  })
  @ApiCreatedResponse({
    description: 'The order, new or, for a repeated Idempotency-Key, the original.',
    type: OrderResponseDto,
    headers: {
      [IDEMPOTENT_REPLAYED_HEADER]: {
        description: 'Present and `true` when the order already existed for this key',
        schema: { type: 'string', example: 'true' },
      },
    },
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.VALIDATION_FAILED)
  @ApiErrorResponse(HttpStatus.CONFLICT, ERRORS.IDEMPOTENCY_KEY_REUSED)
  @ApiErrorResponse(
    HttpStatus.UNPROCESSABLE_ENTITY,
    ERRORS.UNKNOWN_PRODUCTS,
    ERRORS.INACTIVE_PRODUCTS,
    ERRORS.ORDER_TOTAL_TOO_LARGE,
  )
  @Post()
  public async place(
    @Body() dto: PlaceOrderDto,
    @IdempotencyKey() idempotencyKey: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<OrderResponseDto> {
    const { order, replayed } = await this.ordersService.place(toPlaceOrder(dto, idempotencyKey));
    if (replayed) {
      response.setHeader(IDEMPOTENT_REPLAYED_HEADER, 'true');
    }
    return toOrderResponse(order);
  }

  @ApiOperation({
    summary: 'List orders',
    description:
      'One page of orders, newest first, without their lines. Filter by customer and status.',
  })
  @ApiOkResponse({ description: 'One page of orders.', type: OrderPageResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.VALIDATION_FAILED)
  @Get()
  public async list(@Query() query: ListOrdersQuery): Promise<OrderPageResponseDto> {
    const page = await this.ordersService.list(
      { customerId: query.customerId, status: query.status },
      { page: query.page, limit: query.limit },
    );
    return { ...page, items: page.items.map(toOrderSummary) };
  }

  @ApiOperation({
    summary: 'Get an order',
    description: 'One order with its lines and every status it has been in.',
  })
  @ApiParam(ORDER_ID_PARAM)
  @ApiOkResponse({ description: 'The order.', type: OrderResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.INVALID_ID)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, ERRORS.ORDER_NOT_FOUND)
  @Get(':id')
  public async getById(@Param('id', ParseIdPipe) id: string): Promise<OrderResponseDto> {
    return toOrderResponse(await this.ordersService.getById(id));
  }

  @ApiOperation({
    summary: 'Cancel an order',
    description:
      'The customer cancels an order that is PENDING, AWAITING_PAYMENT or CONFIRMED. Returns 202: releasing the stock and refunding a paid order happen afterwards, in the other services.',
  })
  @ApiParam(ORDER_ID_PARAM)
  @ApiAcceptedResponse({ description: 'The cancelled order.', type: OrderResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, COMMON_ERRORS.INVALID_ID)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, ERRORS.ORDER_NOT_FOUND)
  @ApiErrorResponse(
    HttpStatus.CONFLICT,
    ERRORS.INVALID_ORDER_STATE,
    ERRORS.ORDER_CHANGED_CONCURRENTLY,
  )
  @Post(':id/cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  public async cancel(@Param('id', ParseIdPipe) id: string): Promise<OrderResponseDto> {
    return toOrderResponse(await this.ordersService.cancel(id));
  }
}
