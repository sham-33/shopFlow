import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  OUTBOX_BATCH_SIZE,
  OUTBOX_CLEANUP_INTERVAL_MS,
  OUTBOX_RELAY_INTERVAL_MS,
} from '../constants.js';
import { OutboxRelay } from './outbox-relay.js';

/** Runs the relay every 500 ms and the cleanup once a day, for as long as the app runs. */
@Injectable()
export class OutboxRelayScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayScheduler.name);
  private relayTimer: NodeJS.Timeout | undefined;
  private cleanupTimer: NodeJS.Timeout | undefined;
  private relaying = false;

  constructor(private readonly relay: OutboxRelay) {}

  public onApplicationBootstrap(): void {
    this.relayTimer = setInterval(() => void this.relayUntilEmpty(), OUTBOX_RELAY_INTERVAL_MS);
    this.cleanupTimer = setInterval(() => void this.cleanUp(), OUTBOX_CLEANUP_INTERVAL_MS);
  }

  public onModuleDestroy(): void {
    clearInterval(this.relayTimer);
    clearInterval(this.cleanupTimer);
  }

  /** Skips the tick when the last one is still running, so batches never overlap. */
  private async relayUntilEmpty(): Promise<void> {
    if (this.relaying) {
      return;
    }
    this.relaying = true;
    try {
      // A full batch means more may be waiting: do not wait for the next tick.
      let sent: number;
      do {
        sent = await this.relay.relayBatch();
      } while (sent >= OUTBOX_BATCH_SIZE);
    } catch (error) {
      this.logger.error('Could not relay outbox events; will try again', errorStack(error));
    } finally {
      this.relaying = false;
    }
  }

  private async cleanUp(): Promise<void> {
    try {
      const deleted = await this.relay.cleanup();
      this.logger.log(`Deleted ${deleted} published outbox events past their retention time`);
    } catch (error) {
      this.logger.error('Could not delete old outbox events', errorStack(error));
    }
  }
}

function errorStack(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}
