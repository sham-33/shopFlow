import { isUniqueViolation, type PageRequest, toSkipTake } from '@app/common';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, type FindOneOptions, type Repository } from 'typeorm';
import type { OrderStatus } from '../domain/enums.js';
import { OrderStatusHistory } from '../entities/order-status-history.entity.js';
import { Order } from '../entities/order.entity.js';
import type { OrderFilter, OrderRepository, StatusChange } from './order.repository.js';

/** Load an order with everything its response shows, in a stable order. */
const WITH_DETAILS: Pick<FindOneOptions<Order>, 'relations' | 'order'> = {
  relations: { items: true, statusHistory: true },
  order: { items: { sku: 'ASC' }, statusHistory: { changedAt: 'ASC' } },
};

@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  public findById(id: string, manager?: EntityManager): Promise<Order | null> {
    return this.orders(manager).findOne({ where: { id }, ...WITH_DETAILS });
  }

  public findByIdempotencyKey(key: string, manager?: EntityManager): Promise<Order | null> {
    return this.orders(manager).findOne({ where: { idempotencyKey: key }, ...WITH_DETAILS });
  }

  public async list(
    { customerId, status }: OrderFilter,
    page: PageRequest,
  ): Promise<{ items: Order[]; totalItems: number }> {
    const { skip, take } = toSkipTake(page);
    const [items, totalItems] = await this.orders().findAndCount({
      where: { customerId, status },
      order: { createdAt: 'DESC', id: 'ASC' },
      skip,
      take,
    });
    return { items, totalItems };
  }

  public async insert(order: Order, manager?: EntityManager): Promise<Order | null> {
    // A nested transaction (a savepoint inside a caller's transaction) keeps
    // the caller's transaction usable if the insert fails.
    const insertAll = (em: EntityManager): Promise<Order> =>
      em.transaction((tx) => tx.getRepository(Order).save(order));
    try {
      return await insertAll(manager ?? this.dataSource.manager);
    } catch (error) {
      if (isUniqueViolation(error, 'uq_orders_idempotency_key')) {
        return null;
      }
      throw error;
    }
  }

  public changeStatus(
    orderId: string,
    expectedVersion: number,
    from: OrderStatus,
    change: StatusChange,
    manager?: EntityManager,
  ): Promise<boolean> {
    const move = async (tx: EntityManager): Promise<boolean> => {
      // UPDATE … WHERE id = $1 AND version = $2. TypeORM also adds
      // version = version + 1 and updated_at = now().
      const result = await tx
        .createQueryBuilder()
        .update(Order)
        .set({
          status: change.to,
          ...(change.cancelReason ? { cancelReason: change.cancelReason } : {}),
        })
        .where('id = :orderId AND version = :expectedVersion', { orderId, expectedVersion })
        .execute();
      if ((result.affected ?? 0) === 0) {
        return false;
      }
      await tx.getRepository(OrderStatusHistory).insert({
        orderId,
        fromStatus: from,
        toStatus: change.to,
        reason: change.reason,
      });
      return true;
    };
    // A new transaction, or a savepoint inside the caller's transaction.
    return (manager ?? this.dataSource.manager).transaction(move);
  }

  private orders(manager?: EntityManager): Repository<Order> {
    return (manager ?? this.dataSource.manager).getRepository(Order);
  }
}
