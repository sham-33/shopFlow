import { RequestValidationException } from '@app/common';
import { parseIdempotencyKey } from '../../src/decorators/idempotency-key.decorator.js';

describe('parseIdempotencyKey', () => {
  it.each([
    ['a UUID', '5f0c8a2e-1b7d-4c3a-9e21-0d4f6a7b8c90'],
    ['letters, digits and _ . : -', 'checkout_2026.11:26-a'],
    ['a single character', 'k'],
    ['exactly 100 characters', 'k'.repeat(100)],
  ])('accepts %s', (_case, key) => {
    expect(parseIdempotencyKey(key)).toBe(key);
  });

  it.each([
    ['no header', undefined],
    ['an empty value', ''],
    ['101 characters', 'k'.repeat(101)],
    ['a space', 'check out'],
    ['a slash', 'a/b'],
    ['the header sent twice', ['a', 'b']],
  ])('rejects %s with VALIDATION_FAILED naming the header', (_case, value) => {
    const parse = () => parseIdempotencyKey(value);

    expect(parse).toThrow(RequestValidationException);
    expect(parse).toThrow(
      expect.objectContaining({
        details: { fields: [expect.objectContaining({ field: 'Idempotency-Key' })] },
      }) as Error,
    );
  });
});
