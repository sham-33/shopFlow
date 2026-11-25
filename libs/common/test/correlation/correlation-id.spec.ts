import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getCorrelationId,
  getRequestCorrelationId,
  resolveCorrelationId,
  runWithCorrelationId,
} from '../../src/correlation/correlation-id.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function exchange(header?: string | string[], headersSent = false) {
  const req = { headers: header === undefined ? {} : { 'x-correlation-id': header } };
  const res = { headersSent, setHeader: vi.fn() };
  return {
    req: req as unknown as IncomingMessage,
    res: res as unknown as ServerResponse,
    setHeader: res.setHeader,
  };
}

describe('resolveCorrelationId', () => {
  it('keeps a valid incoming ID and sends it back', () => {
    const { req, res, setHeader } = exchange('c-91ab');

    expect(resolveCorrelationId(req, res)).toBe('c-91ab');
    expect(setHeader).toHaveBeenCalledWith('X-Correlation-Id', 'c-91ab');
    expect(getRequestCorrelationId(req)).toBe('c-91ab');
  });

  it('creates a UUID when the request has none', () => {
    const { req, res } = exchange();

    expect(resolveCorrelationId(req, res)).toMatch(UUID);
  });

  it.each([
    ['spaces', 'c 91ab'],
    ['a newline', 'c-91ab\nfake log line'],
    ['more than 128 characters', 'a'.repeat(129)],
    ['an empty value', ''],
  ])('replaces an incoming ID with %s', (_case, header) => {
    const { req, res } = exchange(header);

    expect(resolveCorrelationId(req, res)).toMatch(UUID);
  });

  it('accepts an ID of exactly 128 characters', () => {
    const { req, res } = exchange('a'.repeat(128));

    expect(resolveCorrelationId(req, res)).toBe('a'.repeat(128));
  });

  it('uses the first value when the header is sent twice', () => {
    const { req, res } = exchange(['c-first', 'c-second']);

    expect(resolveCorrelationId(req, res)).toBe('c-first');
  });

  it('returns the same ID on every call for one request, setting the header once', () => {
    const { req, res, setHeader } = exchange();

    const first = resolveCorrelationId(req, res);

    expect(resolveCorrelationId(req, res)).toBe(first);
    expect(setHeader).toHaveBeenCalledTimes(1);
  });

  it('does not try to set the header once the response has started', () => {
    const { req, res, setHeader } = exchange('c-91ab', true);

    expect(resolveCorrelationId(req, res)).toBe('c-91ab');
    expect(setHeader).not.toHaveBeenCalled();
  });
});

describe('runWithCorrelationId', () => {
  it('makes the ID available inside the callback, including after awaits', async () => {
    const seen = await runWithCorrelationId('c-run', async () => {
      await Promise.resolve();
      return getCorrelationId();
    });

    expect(seen).toBe('c-run');
  });

  it('leaves no ID behind outside the callback', () => {
    runWithCorrelationId('c-run', () => undefined);

    expect(getCorrelationId()).toBeUndefined();
  });
});
