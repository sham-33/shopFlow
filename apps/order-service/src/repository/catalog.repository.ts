import type { EntityManager } from 'typeorm';
import type { CatalogProduct } from '../entities/catalog-product.entity.js';

/** What the catalog stores about a product. Money is in paise. */
export interface CatalogEntry {
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly pricePaise: number;
  readonly active: boolean;
}

/** The order service's local copy of the inventory service's products. */
export interface CatalogRepository {
  /** The catalog entries that exist among `productIds`, in any order. */
  findByIds(productIds: readonly string[], manager?: EntityManager): Promise<CatalogProduct[]>;

  /** Inserts the product, or replaces the stored copy that has the same product ID. */
  upsert(product: CatalogEntry, manager?: EntityManager): Promise<void>;
}

/** Injection token for CatalogRepository. */
export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
