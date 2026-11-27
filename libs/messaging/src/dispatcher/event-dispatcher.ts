import type { AnyEvent, EventType } from '@app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { EVENT_HANDLERS, type EventHandler } from './event-handler.js';

/** Sends each event to the handler for its type: the Strategy pattern, chosen by `eventType`. */
@Injectable()
export class EventDispatcher {
  private readonly handlers = new Map<EventType, EventHandler>();

  constructor(@Inject(EVENT_HANDLERS) handlers: readonly EventHandler<EventType>[]) {
    for (const handler of handlers) {
      if (this.handlers.has(handler.eventType)) {
        throw new Error(`More than one handler for ${handler.eventType}`);
      }
      this.handlers.set(handler.eventType, handler);
    }
  }

  /**
   * @returns true if a handler took the event, false if this service has none
   * for it. A topic carries events a service does not care about, so that is
   * not an error.
   */
  public async dispatch(event: AnyEvent): Promise<boolean> {
    const handler = this.handlers.get(event.eventType);
    if (!handler) {
      return false;
    }
    // The map is keyed by event type, so the handler matches the event.
    await handler.handle(event);
    return true;
  }

  public handledTypes(): IterableIterator<EventType> {
    return this.handlers.keys();
  }
}
