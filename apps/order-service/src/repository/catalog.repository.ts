import type { EntityManager } from 'typeorm';
import type { CatalogProduct } from '../entities/catalog-product.entity.js';

/** Read access to the order service's local copy of products. */
export interface CatalogRepository {
  /** The catalog entries that exist among `productIds`, in any order. */
  findByIds(productIds: readonly string[], manager?: EntityManager): Promise<CatalogProduct[]>;
}

/** Injection token for CatalogRepository. */
export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
