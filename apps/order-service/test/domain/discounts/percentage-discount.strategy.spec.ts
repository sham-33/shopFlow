import { PercentageDiscount } from '../../../src/domain/discounts/percentage-discount.strategy.js';
import { aCoupon } from '../../builders/coupon.builder.js';

describe('PercentageDiscount', () => {
  const strategy = new PercentageDiscount();
  const discount = (subtotalPaise: number, percentOff: number) =>
    strategy.discountFor(subtotalPaise, [], aCoupon({ percentOff }));

  it.each([
    [99900, 10, 9990],
    // 10% of ₹19.99 is 199.9 paise: rounds to 200.
    [1999, 10, 200],
    // 10% of ₹19.94 is 199.4 paise: rounds to 199.
    [1994, 10, 199],
    // 15% of ₹0.10 is exactly half a paisa (1.5): rounds up to 2.
    [10, 15, 2],
    [12345, 100, 12345],
    [1, 1, 0],
  ])(
    'takes %i paise × %i%% → %i paise off, rounded to the nearest paisa',
    (subtotal, percent, expected) => {
      expect(discount(subtotal, percent)).toBe(expected);
    },
  );

  it('never takes more than the subtotal: 100% makes the order free', () => {
    expect(discount(99900, 100)).toBe(99900);
  });

  it('takes nothing off an order that costs nothing', () => {
    expect(discount(0, 50)).toBe(0);
  });

  it('fails loudly for a coupon without a percentage', () => {
    expect(() => strategy.discountFor(1000, [], aCoupon({ percentOff: null }))).toThrow(
      'PERCENTAGE coupon SAVE10 has no percent_off',
    );
    expect(() => strategy.discountFor(1000, [], null)).toThrow(
      'PERCENTAGE coupon (none) has no percent_off',
    );
  });
});
