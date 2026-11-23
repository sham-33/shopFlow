import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from '../controllers/products.controller.js';
import { Product } from '../entities/product.entity.js';
import { Stock } from '../entities/stock.entity.js';
import { PRODUCT_REPOSITORY } from '../repository/product.repository.js';
import { TypeOrmProductRepository } from '../repository/typeorm-product.repository.js';
import { ProductsService } from '../services/products.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Stock])],
  controllers: [ProductsController],
  providers: [ProductsService, { provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository }],
})
export class ProductsModule {}
