import { CommonModule, HealthModule } from '@app/common';
import { MessagingModule } from '@app/messaging';
import { Module } from '@nestjs/common';
import { SERVICE_NAME } from './constants.js';
import { ProductUpdatedHandler } from './messaging/handlers/product-updated.handler.js';
import { StockReservationFailedHandler } from './messaging/handlers/stock-reservation-failed.handler.js';
import { StockReservedHandler } from './messaging/handlers/stock-reserved.handler.js';
import { CatalogModule } from './modules/catalog.module.js';
import { DatabaseModule } from './modules/database.module.js';
import { OrdersModule } from './modules/orders.module.js';

@Module({
  imports: [
    CommonModule.forRoot({ serviceName: SERVICE_NAME }),
    DatabaseModule,
    HealthModule,
    MessagingModule.forRoot({
      serviceName: SERVICE_NAME,
      imports: [CatalogModule, OrdersModule],
      handlers: [ProductUpdatedHandler, StockReservedHandler, StockReservationFailedHandler],
    }),
    OrdersModule,
  ],
})
export class AppModule {}
