import { type Page, type PageRequest, toPage } from '@app/common';
import { Inject, Injectable } from '@nestjs/common';
import type { Product } from '../entities/product.entity.js';
import { DuplicateSkuException } from '../exceptions/duplicate-sku.exception.js';
import { ProductNotFoundException } from '../exceptions/product-not-found.exception.js';
import {
  type NewProduct,
  PRODUCT_REPOSITORY,
  type ProductFilter,
  type ProductRepository,
} from '../repository/product.repository.js';

/** Fields of a product that can change after it is created. */
export interface ProductChanges {
  name?: string;
  pricePaise?: number;
  active?: boolean;
}

/**
 * Business rules for products. Knows nothing about HTTP: it takes and returns
 * plain values and entities, and works with money in paise.
 */
@Injectable()
export class ProductsService {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  /** Creates the product with its starting stock. */
  public async create(product: NewProduct): Promise<Product> {
    // A friendly 409 in the usual case. Two requests racing with the same
    // SKU still hit the unique constraint, which the exception filter also
    // turns into a 409.
    if (await this.products.existsBySku(product.sku)) {
      throw new DuplicateSkuException(product.sku);
    }
    return this.products.insert(product);
  }

  public async getById(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new ProductNotFoundException(id);
    }
    return product;
  }

  public async list(filter: ProductFilter, page: PageRequest): Promise<Page<Product>> {
    const { items, totalItems } = await this.products.list(filter, page);
    return toPage(items, totalItems, page);
  }

  public async update(id: string, changes: ProductChanges): Promise<Product> {
    const product = await this.getById(id);
    if (changes.name !== undefined) {
      product.name = changes.name;
    }
    if (changes.pricePaise !== undefined) {
      product.pricePaise = changes.pricePaise;
    }
    if (changes.active !== undefined) {
      product.active = changes.active;
    }
    return this.products.save(product);
  }

  /** Adds `quantity` units to the available stock. */
  public async restock(id: string, quantity: number): Promise<Product> {
    const found = await this.products.addAvailableStock(id, quantity);
    if (!found) {
      throw new ProductNotFoundException(id);
    }
    return this.getById(id);
  }
}
