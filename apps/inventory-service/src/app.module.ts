import { CommonModule } from '@app/common';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database.module.js';
import { ProductsModule } from './modules/products.module.js';

@Module({
  imports: [
    CommonModule.forRoot({ serviceName: 'inventory-service' }),
    DatabaseModule,
    ProductsModule,
  ],
})
export class AppModule {}
