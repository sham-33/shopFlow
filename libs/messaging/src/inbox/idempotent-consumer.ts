import { Inject, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import {
  PROCESSED_EVENT_REPOSITORY,
  type ProcessedEventRepository,
} from './processed-event.repository.js';

/**
 * Makes a handler safe to run twice for the same event (docs/plan.md, section
 * 7.2). Kafka delivers at least once, so duplicates will happen.
 */
@Injectable()
export class IdempotentConsumer {
  constructor(
    @Inject(PROCESSED_EVENT_REPOSITORY) private readonly processed: ProcessedEventRepository,
  ) {}

  /**
   * Inside the handler's transaction: records the event, then runs `work`. If
   * the event was already handled, `work` does not run.
   *
   * Because the record and the work share one transaction, an error in `work`
   * rolls the record back too, so a retry does the work again.
   *
   * @returns true if the work ran, false if the event was a duplicate.
   */
  public async run(
    manager: EntityManager,
    consumerName: string,
    eventId: string,
    work: () => Promise<void>,
  ): Promise<boolean> {
    if (!(await this.processed.markProcessed(eventId, consumerName, manager))) {
      return false;
    }
    await work();
    return true;
  }
}
