import { CommonModule, HealthModule } from '@app/common';
import { MessagingModule } from '@app/messaging';
import { Module } from '@nestjs/common';
import { SERVICE_NAME } from './constants.js';
import { OrderCreatedHandler } from './messaging/handlers/order-created.handler.js';
import { DatabaseModule } from './modules/database.module.js';
import { ProductsModule } from './modules/products.module.js';
import { StockReservationsModule } from './modules/stock-reservations.module.js';

@Module({
  imports: [
    CommonModule.forRoot({ serviceName: SERVICE_NAME }),
    DatabaseModule,
    HealthModule,
    MessagingModule.forRoot({
      serviceName: SERVICE_NAME,
      imports: [StockReservationsModule],
      handlers: [OrderCreatedHandler],
    }),
    ProductsModule,
  ],
})
export class AppModule {}
