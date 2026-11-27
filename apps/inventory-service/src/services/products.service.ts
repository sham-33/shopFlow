import { type Page, type PageRequest, toPage } from '@app/common';
import { createEvent, EventType } from '@app/contracts';
import { currentEventContext, OutboxService } from '@app/messaging';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { Product } from '../entities/product.entity.js';
import { DuplicateSkuException } from '../exceptions/duplicate-sku.exception.js';
import { ProductNotFoundException } from '../exceptions/product-not-found.exception.js';
import { toProductUpdatedPayload } from '../mappers/product-event.mapper.js';
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
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  /** Creates the product with its starting stock, and announces it with ProductUpdated. */
  public async create(product: NewProduct): Promise<Product> {
    // A friendly 409 in the usual case. Two requests racing with the same
    // SKU still hit the unique constraint, which the exception filter also
    // turns into a 409.
    if (await this.products.existsBySku(product.sku)) {
      throw new DuplicateSkuException(product.sku);
    }
    return this.dataSource.transaction(async (manager) => {
      const created = await this.products.insert(product, manager);
      await this.announce(created, manager);
      return created;
    });
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

  /** Changes the product and announces its new state with ProductUpdated. */
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
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.products.save(product, manager);
      await this.announce(saved, manager);
      return saved;
    });
  }

  /** Adds `quantity` units to the available stock. */
  public async restock(id: string, quantity: number): Promise<Product> {
    const found = await this.products.addAvailableStock(id, quantity);
    if (!found) {
      throw new ProductNotFoundException(id);
    }
    return this.getById(id);
  }

  /**
   * Writes ProductUpdated to the outbox in the same transaction as the change,
   * so the product and its event are saved together or not at all. The event is
   * the product's whole state, which is what a compacted topic needs.
   */
  private async announce(product: Product, manager: EntityManager): Promise<void> {
    await this.outbox.add(
      manager,
      createEvent(
        EventType.PRODUCT_UPDATED,
        toProductUpdatedPayload(product),
        currentEventContext(),
      ),
    );
  }
}
