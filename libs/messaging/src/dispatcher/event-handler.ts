import type { EventEnvelope, EventType } from '@app/contracts';

/**
 * The "controller" for one kind of event (docs/plan.md, section 6.2): it reads
 * the event and calls a service method. Business rules stay in the service.
 */
export interface EventHandler<T extends EventType = EventType> {
  readonly eventType: T;
  handle(event: EventEnvelope<T>): Promise<void>;
}

/** Every handler of a service, as one list for the EventDispatcher. */
export const EVENT_HANDLERS = Symbol('EVENT_HANDLERS');
