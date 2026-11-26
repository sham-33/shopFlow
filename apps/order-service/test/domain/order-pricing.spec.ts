import { calculateSubtotal } from '../../src/domain/order-pricing.js';
import { OrderTotalTooLargeException } from '../../src/exceptions/order-total-too-large.exception.js';

describe('calculateSubtotal', () => {
  it('adds quantity × unit price over every line, in paise', () => {
    expect(
      calculateSubtotal([
        { quantity: 2, unitPricePaise: 49950 },
        { quantity: 1, unitPricePaise: 19999 },
        { quantity: 3, unitPricePaise: 1 },
      ]),
    ).toBe(119902);
  });

  it('is exact where floating-point rupees are not: 3 × ₹0.10 is ₹0.30', () => {
    // In rupees, 0.1 * 3 is 0.30000000000000004.
    expect(calculateSubtotal([{ quantity: 3, unitPricePaise: 10 }])).toBe(30);
  });

  it('returns 0 for free items and for no lines', () => {
    expect(calculateSubtotal([{ quantity: 5, unitPricePaise: 0 }])).toBe(0);
    expect(calculateSubtotal([])).toBe(0);
  });

  it('accepts the largest amount the database column can hold', () => {
    expect(calculateSubtotal([{ quantity: 1, unitPricePaise: 999_999_999_999 }])).toBe(
      999_999_999_999,
    );
  });

  it.each([
    ['one paisa above the column limit', [{ quantity: 1, unitPricePaise: 1_000_000_000_000 }]],
    [
      'a total JavaScript cannot count exactly',
      [{ quantity: 10, unitPricePaise: Number.MAX_SAFE_INTEGER }],
    ],
  ])('rejects %s with ORDER_TOTAL_TOO_LARGE', (_case, lines) => {
    expect(() => calculateSubtotal(lines)).toThrow(OrderTotalTooLargeException);
  });
});
