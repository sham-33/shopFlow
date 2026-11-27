import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogProduct } from '../entities/catalog-product.entity.js';
import { CATALOG_REPOSITORY } from '../repository/catalog.repository.js';
import { TypeOrmCatalogRepository } from '../repository/typeorm-catalog.repository.js';
import { CatalogService } from '../services/catalog.service.js';

/** The local product catalog: read by orders, kept up to date from ProductUpdated events. */
@Module({
  imports: [TypeOrmModule.forFeature([CatalogProduct])],
  providers: [CatalogService, { provide: CATALOG_REPOSITORY, useClass: TypeOrmCatalogRepository }],
  // The handler is created by MessagingModule, which imports this module for the service.
  exports: [CATALOG_REPOSITORY, CatalogService],
})
export class CatalogModule {}
