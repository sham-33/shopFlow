import { EVENT_DEFINITIONS } from '@app/contracts';
import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import type { Consumer } from 'kafkajs';
import { EventDispatcher } from '../dispatcher/event-dispatcher.js';
import { MessageProcessor } from './message-processor.js';

/** The part of a kafkajs Consumer that the event consumer uses. */
export type KafkaConsumer = Pick<Consumer, 'connect' | 'disconnect' | 'subscribe' | 'run'>;

export const KAFKA_CONSUMER = Symbol('KAFKA_CONSUMER');

/**
 * Reads the topics the service's handlers need and gives each message to the
 * MessageProcessor. A message is committed only after its handler finishes
 * (docs/plan.md, section 4.4), so a crash means it is read again, never lost.
 * The service's consumer group is its name, so copies of a service share the work.
 */
@Injectable()
export class KafkaEventConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  private connected = false;

  constructor(
    private readonly consumer: KafkaConsumer,
    private readonly dispatcher: EventDispatcher,
    private readonly processor: MessageProcessor,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    const topics = new Set(
      [...this.dispatcher.handledTypes()].map((type) => EVENT_DEFINITIONS[type].topic),
    );
    if (topics.size === 0) {
      return;
    }
    await this.consumer.connect();
    this.connected = true;
    for (const topic of topics) {
      // From the start, so a new service (or one whose offsets are gone) rebuilds
      // its state; on a compacted topic that is one message per product.
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }
    await this.consumer.run({
      // kafkajs commits a message's offset after this function returns.
      eachMessage: async ({ topic, partition, message }) => {
        await this.processor.process({
          topic,
          partition,
          key: message.key,
          value: message.value,
        });
      },
    });
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
    }
  }
}
