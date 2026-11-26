import { isUniqueViolation } from '../../src/database/postgres-errors.js';

const pgError = (fields: Record<string, unknown>): Error => Object.assign(new Error('x'), fields);

describe('isUniqueViolation', () => {
  it.each([
    ['the code on the error', pgError({ code: '23505' })],
    ['the code on driverError', pgError({ driverError: { code: '23505' } })],
  ])('recognises %s', (_case, error) => {
    expect(isUniqueViolation(error)).toBe(true);
  });

  it.each([
    ['another Postgres error', pgError({ code: '23503' })],
    ['an error without a code', new Error('boom')],
    ['a value that is not an Error', { code: '23505' }],
  ])('rejects %s', (_case, error) => {
    expect(isUniqueViolation(error)).toBe(false);
  });

  describe('with a constraint name', () => {
    it.each([
      ['on the error', pgError({ code: '23505', constraint: 'uq_orders_idempotency_key' })],
      [
        'on driverError',
        pgError({ driverError: { code: '23505', constraint: 'uq_orders_idempotency_key' } }),
      ],
    ])('matches the constraint %s', (_case, error) => {
      expect(isUniqueViolation(error, 'uq_orders_idempotency_key')).toBe(true);
    });

    it('does not match a different constraint', () => {
      const error = pgError({ code: '23505', constraint: 'uq_coupons_code' });

      expect(isUniqueViolation(error, 'uq_orders_idempotency_key')).toBe(false);
    });
  });
});
