/** One Kafka message, ready to send. */
export interface OutgoingMessage {
  readonly topic: string;
  /** Messages with the same key go to the same partition, in the order sent. */
  readonly key: string;
  /** The event envelope as JSON. */
  readonly value: string;
  readonly headers: Readonly<Record<string, string>>;
}

/** Sends messages to Kafka. The outbox relay is its only caller: services never publish directly. */
export interface EventPublisher {
  /** Resolves when Kafka has stored every message; rejects when it may not have. */
  publish(messages: readonly OutgoingMessage[]): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
