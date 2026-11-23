import { type PageRequest, toSkipTake } from '@app/common';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { Product } from '../entities/product.entity.js';
import { Stock } from '../entities/stock.entity.js';
import type { NewProduct, ProductFilter, ProductRepository } from './product.repository.js';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  public findById(id: string, manager?: EntityManager): Promise<Product | null> {
    return this.products(manager).findOne({
      where: { id },
      relations: { stock: true },
    });
  }

  public existsBySku(sku: string, manager?: EntityManager): Promise<boolean> {
    return this.products(manager).existsBy({ sku });
  }

  public async list(
    { search }: ProductFilter,
    page: PageRequest,
  ): Promise<{ items: Product[]; totalItems: number }> {
    const { skip, take } = toSkipTake(page);
    const query = this.products()
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.stock', 'stock')
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('product.id', 'ASC')
      .skip(skip)
      .take(take);

    if (search) {
      query.where('(product.name ILIKE :pattern OR product.sku ILIKE :pattern)', {
        pattern: `%${escapeLikePattern(search)}%`,
      });
    }

    const [items, totalItems] = await query.getManyAndCount();
    return { items, totalItems };
  }

  public insert(input: NewProduct, manager?: EntityManager): Promise<Product> {
    const insertBoth = async (m: EntityManager): Promise<Product> => {
      const products = m.getRepository(Product);
      const stocks = m.getRepository(Stock);

      const product = await products.save(
        products.create({
          sku: input.sku,
          name: input.name,
          pricePaise: input.pricePaise,
        }),
      );
      product.stock = await stocks.save(
        stocks.create({
          productId: product.id,
          availableQty: input.initialQuantity,
          reservedQty: 0,
        }),
      );
      return product;
    };

    return manager ? insertBoth(manager) : this.dataSource.transaction(insertBoth);
  }

  public save(product: Product, manager?: EntityManager): Promise<Product> {
    return this.products(manager).save(product);
  }

  public async addAvailableStock(
    productId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    // UPDATE stock SET available_qty = available_qty + $1 ... in one
    // statement. TypeORM also bumps the version column.
    const result = await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(Stock)
      .set({ availableQty: () => 'available_qty + :quantity' })
      .where('product_id = :productId', { productId })
      .setParameter('quantity', quantity)
      .execute();
    return (result.affected ?? 0) > 0;
  }

  private products(manager?: EntityManager): Repository<Product> {
    return (manager ?? this.dataSource.manager).getRepository(Product);
  }
}

/** Makes `%`, `_` and `\` in user input match literally in ILIKE. */
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}
