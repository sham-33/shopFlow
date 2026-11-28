import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from '../controllers/orders.controller.js';
import { DiscountStrategyFactory } from '../domain/discounts/discount-strategy.factory.js';
import { OrderStateMachine } from '../domain/order-state-machine.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { OrderStatusHistory } from '../entities/order-status-history.entity.js';
import { Order } from '../entities/order.entity.js';
import { ORDER_REPOSITORY } from '../repository/order.repository.js';
import { TypeOrmOrderRepository } from '../repository/typeorm-order.repository.js';
import { OrderSagaService } from '../services/order-saga.service.js';
import { OrdersService } from '../services/orders.service.js';
import { CatalogModule } from './catalog.module.js';
import { CouponsModule } from './coupons.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory]),
    CatalogModule,
    CouponsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderSagaService,
    // Plain domain classes with no dependencies, so they need no @Injectable().
    { provide: OrderStateMachine, useValue: new OrderStateMachine() },
    { provide: DiscountStrategyFactory, useValue: new DiscountStrategyFactory() },
    { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
  ],
  // For the event handlers that MessagingModule creates.
  exports: [OrderSagaService],
})
export class OrdersModule {}
