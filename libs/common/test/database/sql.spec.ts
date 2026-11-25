import { sqlIn } from '../../src/database/sql.js';

describe('sqlIn', () => {
  it('limits a column to the given values', () => {
    expect(sqlIn('status', ['PENDING', 'CONFIRMED'])).toBe(`"status" IN ('PENDING', 'CONFIRMED')`);
  });

  it.each([
    ['a quote', "PENDING'); DROP TABLE orders; --"],
    ['lower case', 'pending'],
    ['a space', 'IN PROGRESS'],
    ['an empty string', ''],
  ])('refuses a value with %s', (_case, value) => {
    expect(() => sqlIn('status', [value])).toThrow(
      'Unsafe value for a CHECK constraint on "status"',
    );
  });

  it('refuses an empty list, which would make every insert fail', () => {
    expect(() => sqlIn('status', [])).toThrow('sqlIn needs at least one value for "status"');
  });
});
