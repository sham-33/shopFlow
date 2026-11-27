import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ProcessedEvent } from './processed-event.entity.js';
import type { ProcessedEventRepository } from './processed-event.repository.js';

@Injectable()
export class TypeOrmProcessedEventRepository implements ProcessedEventRepository {
  public async markProcessed(
    eventId: string,
    consumerName: string,
    manager: EntityManager,
  ): Promise<boolean> {
    // ON CONFLICT DO NOTHING, not "insert and catch the unique violation": in
    // Postgres a failed statement would abort the whole transaction.
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(ProcessedEvent)
      .values({ eventId, consumerName })
      .orIgnore()
      .returning('event_id')
      .execute();
    return (result.raw as unknown[]).length > 0;
  }
}
