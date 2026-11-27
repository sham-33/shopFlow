import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kafka } from 'kafkajs';
import { KAFKA_CONNECTION_TIMEOUT_MS } from './constants.js';
import { IdempotentConsumer } from './inbox/idempotent-consumer.js';
import { ProcessedEvent } from './inbox/processed-event.entity.js';
import { PROCESSED_EVENT_REPOSITORY } from './inbox/processed-event.repository.js';
import { TypeOrmProcessedEventRepository } from './inbox/typeorm-processed-event.repository.js';
import { EVENT_PUBLISHER } from './kafka/event-publisher.js';
import { readKafkaBrokers } from './kafka/kafka-config.js';
import { KAFKA_PRODUCER, KafkaEventPublisher } from './kafka/kafka-event-publisher.js';
import { OutboxEvent } from './outbox/outbox-event.entity.js';
import { OutboxRelay } from './outbox/outbox-relay.js';
import { OutboxRelayScheduler } from './outbox/outbox-relay.scheduler.js';
import { OUTBOX_REPOSITORY } from './outbox/outbox.repository.js';
import { OutboxService } from './outbox/outbox.service.js';
import { TypeOrmOutboxRepository } from './outbox/typeorm-outbox.repository.js';

/**
 * The service side of messaging: the outbox (write events with
 * `OutboxService.add` in a transaction, and a relay sends them to Kafka) and
 * `IdempotentConsumer` for handlers. Import it after the service's DatabaseModule.
 *
 * The service's database config must list `OutboxEvent` and `ProcessedEvent`
 * as entities, and its migrations must create their tables.
 */
@Module({})
export class MessagingModule {
  /** `serviceName` is the Kafka client ID. */
  public static forRoot(options: { serviceName: string }): {
    module: typeof MessagingModule;
  } & Record<string, unknown> {
    return {
      module: MessagingModule,
      imports: [TypeOrmModule.forFeature([OutboxEvent, ProcessedEvent])],
      providers: [
        {
          provide: KAFKA_PRODUCER,
          useFactory: () =>
            new Kafka({
              clientId: options.serviceName,
              brokers: readKafkaBrokers(),
              connectionTimeout: KAFKA_CONNECTION_TIMEOUT_MS,
              requestTimeout: KAFKA_CONNECTION_TIMEOUT_MS,
            }).producer({
              // Kafka drops duplicates caused by network retries. It needs one
              // request in flight at a time to keep the order of the messages.
              idempotent: true,
              maxInFlightRequests: 1,
              allowAutoTopicCreation: false,
            }),
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: (producer: ConstructorParameters<typeof KafkaEventPublisher>[0]) =>
            new KafkaEventPublisher(producer),
          inject: [KAFKA_PRODUCER],
        },
        { provide: OUTBOX_REPOSITORY, useClass: TypeOrmOutboxRepository },
        { provide: PROCESSED_EVENT_REPOSITORY, useClass: TypeOrmProcessedEventRepository },
        OutboxService,
        OutboxRelay,
        OutboxRelayScheduler,
        IdempotentConsumer,
      ],
      exports: [OutboxService, IdempotentConsumer],
    };
  }
}
