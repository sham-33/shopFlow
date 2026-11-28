import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In } from 'typeorm';
import { Stock } from '../entities/stock.entity.js';
import type { StockRepository } from './stock.repository.js';

@Injectable()
export class TypeOrmStockRepository implements StockRepository {
  constructor(private readonly dataSource: DataSource) {}

  public async reserve(
    productId: string,
    quantity: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    // The check and the change are one statement, so two orders can never
    // both take the last unit. TypeORM also bumps the version column.
    const result = await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(Stock)
      .set({
        availableQty: () => 'available_qty - :quantity',
        reservedQty: () => 'reserved_qty + :quantity',
      })
      .where('product_id = :productId AND available_qty >= :quantity', {
        productId,
        quantity,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  public async availableQuantities(
    productIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, number>> {
    const rows = await (manager ?? this.dataSource.manager).getRepository(Stock).find({
      select: { productId: true, availableQty: true },
      where: { productId: In(productIds) },
    });
    return new Map(rows.map(({ productId, availableQty }) => [productId, availableQty]));
  }
}
