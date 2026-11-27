import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { OutboxEvent } from './outbox-event.entity.js';
import type { NewOutboxEvent, OutboxRepository } from './outbox.repository.js';

@Injectable()
export class TypeOrmOutboxRepository implements OutboxRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  public async add(event: NewOutboxEvent, manager?: EntityManager): Promise<void> {
    await (manager ?? this.dataSource.manager).insert(OutboxEvent, event);
  }

  public async claimUnpublished(limit: number, manager: EntityManager): Promise<OutboxEvent[]> {
    // The order of creation keeps one order's events in the order they were written.
    return manager
      .createQueryBuilder(OutboxEvent, 'event')
      .where('event.published_at IS NULL')
      .orderBy('event.created_at', 'ASC')
      .addOrderBy('event.id', 'ASC')
      .limit(limit)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getMany();
  }

  public async markPublished(ids: readonly string[], manager: EntityManager): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({ publishedAt: () => 'now()' })
      .whereInIds([...ids])
      .execute();
  }

  public async recordFailedAttempt(ids: readonly string[]): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({ attempts: () => 'attempts + 1' })
      .whereInIds([...ids])
      .execute();
  }

  public async deletePublishedBefore(cutoff: Date): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(OutboxEvent)
      .where('published_at IS NOT NULL AND published_at < :cutoff', { cutoff })
      .execute();
    return result.affected ?? 0;
  }
}
