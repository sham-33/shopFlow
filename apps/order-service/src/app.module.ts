import { CommonModule, HealthModule } from '@app/common';
import { Module } from '@nestjs/common';
import { SERVICE_NAME } from './constants.js';
import { DatabaseModule } from './modules/database.module.js';
import { OrdersModule } from './modules/orders.module.js';

@Module({
  imports: [
    CommonModule.forRoot({ serviceName: SERVICE_NAME }),
    DatabaseModule,
    HealthModule,
    OrdersModule,
  ],
})
export class AppModule {}
