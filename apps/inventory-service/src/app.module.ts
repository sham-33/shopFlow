import { CommonModule } from '@app/common';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database.module.js';
import { HealthModule } from './modules/health.module.js';
import { ProductsModule } from './modules/products.module.js';

@Module({
  imports: [
    CommonModule.forRoot({ serviceName: 'inventory-service' }),
    DatabaseModule,
    HealthModule,
    ProductsModule,
  ],
})
export class AppModule {}
