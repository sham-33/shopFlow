import { CorrelationScope } from '@app/common';
import type { ServiceName } from '@app/contracts';
import { Module, type DynamicModule, type Provider, type Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kafka } from 'kafkajs';
import { KAFKA_CONNECTION_TIMEOUT_MS } from './constants.js';
import { KAFKA_CONSUMER, KafkaEventConsumer } from './consumer/kafka-event-consumer.js';
import { MessageProcessor } from './consumer/message-processor.js';
import { EventDispatcher } from './dispatcher/event-dispatcher.js';
import { EVENT_HANDLERS, type EventHandler } from './dispatcher/event-handler.js';
import { IdempotentConsumer } from './inbox/idempotent-consumer.js';
import { ProcessedEvent } from './inbox/processed-event.entity.js';
import { PROCESSED_EVENT_REPOSITORY } from './inbox/processed-event.repository.js';
import { TypeOrmProcessedEventRepository } from './inbox/typeorm-processed-event.repository.js';
import { EVENT_PUBLISHER, type EventPublisher } from './kafka/event-publisher.js';
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
export interface MessagingOptions {
  /** The service's name: the Kafka client ID and consumer group, and the producer of its events. */
  serviceName: ServiceName;
  /** Modules that export what the handlers need, such as the service that does the work. */
  imports?: NonNullable<DynamicModule['imports']>;
  /** One class per event type this service reacts to. Without any, the service only sends events. */
  handlers?: Type<EventHandler>[];
}

/**
 * The service side of messaging: the outbox (write events with
 * `OutboxService.add` in a transaction, and a relay sends them to Kafka),
 * `IdempotentConsumer` for handlers, and, when the service has handlers, a
 * Kafka consumer that dispatches each event to its handler. Import it after the
 * service's DatabaseModule.
 *
 * The service's database config must list `OutboxEvent` and `ProcessedEvent`
 * as entities, and its migrations must create their tables.
 */
@Module({})
export class MessagingModule {
  public static forRoot({
    serviceName,
    imports = [],
    handlers = [],
  }: MessagingOptions): DynamicModule {
    const kafka = (): Kafka =>
      new Kafka({
        clientId: serviceName,
        brokers: readKafkaBrokers(),
        connectionTimeout: KAFKA_CONNECTION_TIMEOUT_MS,
        requestTimeout: KAFKA_CONNECTION_TIMEOUT_MS,
      });

    const providers: Provider[] = [
      {
        provide: KAFKA_PRODUCER,
        useFactory: () =>
          kafka().producer({
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
    ];

    if (handlers.length > 0) {
      providers.push(
        ...handlers,
        { provide: EVENT_HANDLERS, useFactory: (...all: EventHandler[]) => all, inject: handlers },
        EventDispatcher,
        {
          provide: MessageProcessor,
          useFactory: (
            dispatcher: EventDispatcher,
            publisher: EventPublisher,
            correlation: CorrelationScope,
          ) => new MessageProcessor(serviceName, dispatcher, publisher, correlation),
          // CorrelationScope comes from the global CommonModule.
          inject: [EventDispatcher, EVENT_PUBLISHER, CorrelationScope],
        },
        {
          // One consumer group per service: its copies share the partitions.
          provide: KAFKA_CONSUMER,
          useFactory: () =>
            kafka().consumer({ groupId: serviceName, allowAutoTopicCreation: false }),
        },
        {
          provide: KafkaEventConsumer,
          useFactory: (
            consumer: ConstructorParameters<typeof KafkaEventConsumer>[0],
            dispatcher: EventDispatcher,
            processor: MessageProcessor,
          ) => new KafkaEventConsumer(consumer, dispatcher, processor),
          inject: [KAFKA_CONSUMER, EventDispatcher, MessageProcessor],
        },
      );
    }

    return {
      module: MessagingModule,
      // Feature modules inject OutboxService and IdempotentConsumer without importing this module.
      global: true,
      imports: [TypeOrmModule.forFeature([OutboxEvent, ProcessedEvent]), ...imports],
      providers,
      exports: [OutboxService, IdempotentConsumer],
    };
  }
}
