import { NoDiscount } from '../../../src/domain/discounts/no-discount.strategy.js';

describe('NoDiscount', () => {
  it('takes nothing off, whatever the order', () => {
    expect(new NoDiscount().discountFor()).toBe(0);
  });
});
