import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In } from 'typeorm';
import { CatalogProduct } from '../entities/catalog-product.entity.js';
import type { CatalogEntry, CatalogRepository } from './catalog.repository.js';

@Injectable()
export class TypeOrmCatalogRepository implements CatalogRepository {
  constructor(private readonly dataSource: DataSource) {}

  public findByIds(
    productIds: readonly string[],
    manager?: EntityManager,
  ): Promise<CatalogProduct[]> {
    if (productIds.length === 0) {
      return Promise.resolve([]);
    }
    return (manager ?? this.dataSource.manager)
      .getRepository(CatalogProduct)
      .findBy({ productId: In([...productIds]) });
  }

  public async upsert(product: CatalogEntry, manager?: EntityManager): Promise<void> {
    // One statement, so two events for one product cannot race between a read and a write.
    await (manager ?? this.dataSource.manager)
      .getRepository(CatalogProduct)
      .upsert(product, { conflictPaths: ['productId'], skipUpdateIfNoValuesChanged: true });
  }
}
