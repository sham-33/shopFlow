import { InvalidEventError } from '../../src/invalid-event.error.js';

/** The fields named by the InvalidEventError that `attempt` throws, sorted. */
export function problemFields(attempt: () => unknown): string[] {
  try {
    attempt();
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidEventError);
    return (error as InvalidEventError).problems.map(({ field }) => field).sort();
  }
  throw new Error('Expected an InvalidEventError, but nothing was thrown');
}
