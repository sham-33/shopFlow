import type { EntityManager } from 'typeorm';

export interface ProcessedEventRepository {
  /**
   * Records that `consumerName` is handling `eventId`. Returns false when it
   * already was, in this or an earlier transaction. A concurrent copy waits for
   * the first one's transaction to finish, then gets false if it committed.
   */
  markProcessed(eventId: string, consumerName: string, manager: EntityManager): Promise<boolean>;
}

export const PROCESSED_EVENT_REPOSITORY = Symbol('PROCESSED_EVENT_REPOSITORY');
