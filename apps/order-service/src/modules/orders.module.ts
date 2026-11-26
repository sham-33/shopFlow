import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from '../controllers/orders.controller.js';
import { OrderStateMachine } from '../domain/order-state-machine.js';
import { CatalogProduct } from '../entities/catalog-product.entity.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { OrderStatusHistory } from '../entities/order-status-history.entity.js';
import { Order } from '../entities/order.entity.js';
import { CATALOG_REPOSITORY } from '../repository/catalog.repository.js';
import { ORDER_REPOSITORY } from '../repository/order.repository.js';
import { TypeOrmCatalogRepository } from '../repository/typeorm-catalog.repository.js';
import { TypeOrmOrderRepository } from '../repository/typeorm-order.repository.js';
import { OrdersService } from '../services/orders.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, CatalogProduct])],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    // A plain domain class with no dependencies, so it needs no @Injectable().
    { provide: OrderStateMachine, useValue: new OrderStateMachine() },
    { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
    { provide: CATALOG_REPOSITORY, useClass: TypeOrmCatalogRepository },
  ],
})
export class OrdersModule {}
