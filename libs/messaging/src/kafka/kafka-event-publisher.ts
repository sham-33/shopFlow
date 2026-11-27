import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Producer } from 'kafkajs';
import { PRODUCER_ACKS_ALL } from '../constants.js';
import type { EventPublisher, OutgoingMessage } from './event-publisher.js';

/** The part of a kafkajs Producer that the publisher uses. */
export type KafkaProducer = Pick<Producer, 'connect' | 'disconnect' | 'sendBatch'>;

export const KAFKA_PRODUCER = Symbol('KAFKA_PRODUCER');

/**
 * Publishes to Kafka with an idempotent producer and `acks: all` (docs/plan.md,
 * section 4.4): Kafka drops duplicates caused by network retries, and a send
 * succeeds only when all replicas have the messages.
 */
@Injectable()
export class KafkaEventPublisher implements EventPublisher, OnModuleInit, OnModuleDestroy {
  constructor(private readonly producer: KafkaProducer) {}

  public async onModuleInit(): Promise<void> {
    await this.producer.connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  public async publish(messages: readonly OutgoingMessage[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }
    // One request for the whole batch. Map keeps topics in the order they first appear.
    const byTopic = new Map<
      string,
      { key: string; value: string; headers: Record<string, string> }[]
    >();
    for (const { topic, key, value, headers } of messages) {
      const group = byTopic.get(topic) ?? [];
      group.push({ key, value, headers: { ...headers } });
      byTopic.set(topic, group);
    }
    await this.producer.sendBatch({
      acks: PRODUCER_ACKS_ALL,
      topicMessages: [...byTopic].map(([topic, topicMessages]) => ({
        topic,
        messages: topicMessages,
      })),
    });
  }
}
