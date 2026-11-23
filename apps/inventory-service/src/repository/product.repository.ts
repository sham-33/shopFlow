import type { PageRequest } from '@app/common';
import type { EntityManager } from 'typeorm';
import type { Product } from '../entities/product.entity.js';

export interface NewProduct {
  sku: string;
  name: string;
  pricePaise: number;
  /** Starting `available_qty` of the product's stock row. */
  initialQuantity: number;
}

export interface ProductFilter {
  /** Matches anywhere in the name or SKU, ignoring case. */
  search?: string;
}

/**
 * Database access for products. The service depends on this interface, not
 * on TypeORM, so unit tests can swap in a fake.
 *
 * Every method takes an optional EntityManager so a caller can run several
 * calls in one transaction (the outbox in Week 3 needs this).
 */
export interface ProductRepository {
  /** The product with its stock loaded, or null. */
  findById(id: string, manager?: EntityManager): Promise<Product | null>;

  existsBySku(sku: string, manager?: EntityManager): Promise<boolean>;

  /** One page of products with their stock, newest first. */
  list(filter: ProductFilter, page: PageRequest): Promise<{ items: Product[]; totalItems: number }>;

  /**
   * Inserts the product and its stock row together: both or neither. Runs
   * its own transaction unless a manager is passed.
   */
  insert(product: NewProduct, manager?: EntityManager): Promise<Product>;

  save(product: Product, manager?: EntityManager): Promise<Product>;

  /**
   * Adds to `available_qty` in one atomic UPDATE, so concurrent changes are
   * never lost. Returns false if the product does not exist.
   */
  addAvailableStock(productId: string, quantity: number, manager?: EntityManager): Promise<boolean>;
}

/** Injection token for ProductRepository. */
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
