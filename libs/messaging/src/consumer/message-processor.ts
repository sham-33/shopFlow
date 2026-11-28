import type { CorrelationScope } from '@app/common';
import { deadLetterTopic, InvalidEventError, parseEvent, type ServiceName } from '@app/contracts';
import { Logger } from '@nestjs/common';
import { DEAD_LETTER_ERROR_MAX_LENGTH, DEAD_LETTER_HEADERS } from '../constants.js';
import type { EventDispatcher } from '../dispatcher/event-dispatcher.js';
import type { EventPublisher } from '../kafka/event-publisher.js';

/** A Kafka message as the consumer receives it. */
export interface ReceivedMessage {
  readonly topic: string;
  readonly partition: number;
  readonly key: Buffer | null;
  readonly value: Buffer | null;
}

/**
 * Handles one Kafka message: reads it as an event and dispatches it.
 *
 * - A message that breaks the contract can never succeed, so it goes to this
 *   service's dead-letter topic and the consumer carries on.
 * - An error from a handler is passed on. The message is then not committed and
 *   is read again. Retry topics and backoff come in Week 4.
 */
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly service: ServiceName,
    private readonly dispatcher: EventDispatcher,
    private readonly publisher: EventPublisher,
    private readonly correlation: CorrelationScope,
  ) {}

  public async process(message: ReceivedMessage): Promise<void> {
    let event;
    try {
      event = parseEvent(message.value);
    } catch (error) {
      if (error instanceof InvalidEventError) {
        await this.deadLetter(message, error);
        return;
      }
      throw error;
    }
    // Everything the handler logs, and every event it writes, carries the event's journey.
    await this.correlation.run(event.correlationId, async () => {
      const handled = await this.dispatcher.dispatch(event);
      if (handled) {
        this.logger.log(`Handled ${event.eventType} ${event.eventId}`);
      } else {
        this.logger.debug(
          `Ignored ${event.eventType} ${event.eventId}: no handler in this service`,
        );
      }
    });
  }

  private async deadLetter(message: ReceivedMessage, error: InvalidEventError): Promise<void> {
    const target = deadLetterTopic(this.service);
    this.logger.warn(`Moved a message from ${message.topic} to ${target}: ${describe(error)}`);
    await this.publisher.publish([
      {
        topic: target,
        key: message.key?.toString() ?? '',
        value: message.value?.toString() ?? '',
        headers: {
          [DEAD_LETTER_HEADERS.ORIGINAL_TOPIC]: message.topic,
          [DEAD_LETTER_HEADERS.ORIGINAL_PARTITION]: String(message.partition),
          [DEAD_LETTER_HEADERS.ERROR]: describe(error),
        },
      },
    ]);
  }
}

function describe(error: InvalidEventError): string {
  const fields = error.problems.map(({ field }) => field).join(', ');
  const text = fields ? `${error.message}: ${fields}` : error.message;
  return text.slice(0, DEAD_LETTER_ERROR_MAX_LENGTH);
}
