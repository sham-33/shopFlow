import { CommonModule, HealthModule } from '@app/common';
import { MessagingModule } from '@app/messaging';
import { Module } from '@nestjs/common';
import { SERVICE_NAME } from './constants.js';
import { DatabaseModule } from './modules/database.module.js';
import { OrdersModule } from './modules/orders.module.js';

@Module({
  imports: [
    CommonModule.forRoot({ serviceName: SERVICE_NAME }),
    DatabaseModule,
    HealthModule,
    MessagingModule.forRoot({ serviceName: SERVICE_NAME }),
    OrdersModule,
  ],
})
export class AppModule {}
