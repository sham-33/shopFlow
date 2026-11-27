import { runWithCorrelationId } from '@app/common';
import { currentEventContext } from '../src/current-event-context.js';

describe('currentEventContext', () => {
  it('continues the correlation ID of the request or event being handled', () => {
    expect(runWithCorrelationId('c-91ab', () => currentEventContext())).toEqual({
      correlationId: 'c-91ab',
      causationId: null,
    });
  });

  it('starts a new journey outside any request, such as a scheduled job', () => {
    const first = currentEventContext();
    const second = currentEventContext();

    expect(first.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.correlationId).not.toBe(second.correlationId);
    expect(first.causationId).toBeNull();
  });
});
