import { BuyOneGetOne } from '../../../src/domain/discounts/buy-one-get-one.strategy.js';

describe('BuyOneGetOne', () => {
  const strategy = new BuyOneGetOne();
  const discount = (lines: { quantity: number; unitPricePaise: number }[]) =>
    strategy.discountFor(0, lines);

  it.each([
    [1, 0],
    [2, 1000],
    // Odd quantities: the third unit is paid for.
    [3, 1000],
    [4, 2000],
    [5, 2000],
    [10, 5000],
  ])('makes every second unit free: %i units → %i paise off', (quantity, expected) => {
    expect(discount([{ quantity, unitPricePaise: 1000 }])).toBe(expected);
  });

  it('works line by line: different products never pair up', () => {
    expect(
      discount([
        { quantity: 1, unitPricePaise: 49950 },
        { quantity: 1, unitPricePaise: 19999 },
      ]),
    ).toBe(0);
  });

  it('adds up the free units of every line', () => {
    expect(
      discount([
        { quantity: 2, unitPricePaise: 49950 },
        { quantity: 3, unitPricePaise: 19999 },
      ]),
    ).toBe(49950 + 19999);
  });

  it('takes nothing off an order with no lines', () => {
    expect(discount([])).toBe(0);
  });
});
