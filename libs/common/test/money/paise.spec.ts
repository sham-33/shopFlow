import {
  decimalToPaise,
  paiseToDecimal,
  paiseToRupees,
  paiseTransformer,
  percentOfPaise,
  rupeesToPaise,
} from '../../src/money/paise.js';

describe('decimalToPaise', () => {
  it.each([
    ['499.50', 49950],
    ['499.5', 49950],
    ['499', 49900],
    ['0.05', 5],
    ['0.00', 0],
    ['-1.25', -125],
    ['-0.00', 0],
    // The largest value a numeric(12,2) column can hold.
    ['9999999999.99', 999999999999],
  ])('turns "%s" into %i paise', (amount, paise) => {
    expect(decimalToPaise(amount)).toBe(paise);
  });

  it.each(['', 'abc', '1.234', '1,50', '.5', '1e3', ' 1.00'])('rejects "%s"', (amount) => {
    expect(() => decimalToPaise(amount)).toThrow(TypeError);
  });

  it('rejects amounts too large to count exactly in paise', () => {
    expect(() => decimalToPaise('99999999999999999.00')).toThrow(RangeError);
  });
});

describe('paiseToDecimal', () => {
  it.each([
    [49950, '499.50'],
    [49900, '499.00'],
    [5, '0.05'],
    [0, '0.00'],
    [-125, '-1.25'],
    [999999999999, '9999999999.99'],
  ])('turns %i paise into "%s"', (paise, amount) => {
    expect(paiseToDecimal(paise)).toBe(amount);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (paise) => {
    expect(() => paiseToDecimal(paise)).toThrow(RangeError);
  });
});

describe('paiseTransformer', () => {
  it('passes null and undefined through', () => {
    expect(paiseTransformer.to(null)).toBeNull();
    expect(paiseTransformer.to(undefined)).toBeUndefined();
    expect(paiseTransformer.from(null)).toBeNull();
  });

  it('round-trips a value through the database format', () => {
    expect(paiseTransformer.from(paiseTransformer.to(19999) ?? null)).toBe(19999);
  });
});

describe('rupeesToPaise', () => {
  it.each([
    [499.5, 49950],
    [19.99, 1999],
    [0.1, 10],
    [0, 0],
    [9999999999.99, 999999999999],
  ])('turns %s rupees into %i paise', (rupees, paise) => {
    expect(rupeesToPaise(rupees)).toBe(paise);
  });

  it.each([1.234, 1e21, 1e-7])('rejects %s instead of rounding it', (rupees) => {
    expect(() => rupeesToPaise(rupees)).toThrow(TypeError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (rupees) => {
    expect(() => rupeesToPaise(rupees)).toThrow(RangeError);
  });
});

describe('paiseToRupees', () => {
  it.each([
    [49950, 499.5],
    [1999, 19.99],
    [5, 0.05],
  ])('turns %i paise into %s rupees', (paise, rupees) => {
    expect(paiseToRupees(paise)).toBe(rupees);
  });

  it('prints exactly in JSON', () => {
    expect(JSON.stringify({ price: paiseToRupees(1999) })).toBe('{"price":19.99}');
  });

  it('rejects a fractional number of paise', () => {
    expect(() => paiseToRupees(1.5)).toThrow(RangeError);
  });
});

describe('percentOfPaise', () => {
  it.each([
    [10000, 10, 1000],
    [99900, 10, 9990],
    // 10% of ₹19.99 is 199.9 paise: rounds up to 200.
    [1999, 10, 200],
    // 10% of ₹19.94 is 199.4 paise: rounds down to 199.
    [1994, 10, 199],
    // Exactly half a paisa rounds up.
    [5, 10, 1],
    [4, 10, 0],
    [12345, 100, 12345],
    [12345, 0, 0],
    [0, 50, 0],
    // The largest order total: 33% is 329,999,999,999.67 paise, which rounds up.
    [999_999_999_999, 33, 330_000_000_000],
  ])('%i paise × %i%% = %i paise', (paise, percent, expected) => {
    expect(percentOfPaise(paise, percent)).toBe(expected);
  });

  it.each([
    ['a fraction of a paisa', 1.5, 10],
    ['negative paise', -100, 10],
    ['a fractional percent', 100, 12.5],
    ['a percent above 100', 100, 101],
    ['a negative percent', 100, -1],
  ])('rejects %s', (_case, paise, percent) => {
    expect(() => percentOfPaise(paise, percent)).toThrow(RangeError);
  });
});
