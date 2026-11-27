import { validateSync } from 'class-validator';
import { MAX_AMOUNT_RUPEES } from '../../src/constants.js';
import { isRupees, IsRupees } from '../../src/decorators/is-rupees.decorator.js';

class Priced {
  @IsRupees()
  public price: unknown;
}

describe('isRupees', () => {
  it.each([
    [0, true],
    [0.01, true],
    [19.99, true],
    [499.5, true],
    [MAX_AMOUNT_RUPEES, true],
    [-0.01, false],
    [1.005, false],
    [1e-7, false],
    [10_000_000_000, false],
    [NaN, false],
    [Infinity, false],
    ['499.50', false],
    [null, false],
    [undefined, false],
  ])('%s → %s', (value, expected) => {
    expect(isRupees(value)).toBe(expected);
  });
});

describe('@IsRupees', () => {
  it('explains the rule when the value breaks it', () => {
    const errors = validateSync(Object.assign(new Priced(), { price: 1.005 }));

    expect(errors[0]?.constraints).toEqual({
      isRupees: `price must be an amount in rupees from 0 to ${MAX_AMOUNT_RUPEES} with at most 2 decimals`,
    });
  });

  it('passes a valid amount', () => {
    expect(validateSync(Object.assign(new Priced(), { price: 499.5 }))).toEqual([]);
  });
});
