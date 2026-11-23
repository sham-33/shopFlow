import {
  decimalToPaise,
  paiseToDecimal,
  paiseTransformer,
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

  it.each(['', 'abc', '1.234', '1,50', '.5', '1e3', ' 1.00'])(
    'rejects "%s"',
    (amount) => {
      expect(() => decimalToPaise(amount)).toThrow(TypeError);
    },
  );

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

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %s',
    (paise) => {
      expect(() => paiseToDecimal(paise)).toThrow(RangeError);
    },
  );
});

describe('paiseTransformer', () => {
  it('passes null and undefined through', () => {
    expect(paiseTransformer.to(null)).toBeNull();
    expect(paiseTransformer.to(undefined)).toBeUndefined();
    expect(paiseTransformer.from(null)).toBeNull();
  });

  it('round-trips a value through the database format', () => {
    expect(paiseTransformer.from(paiseTransformer.to(19999) ?? null)).toBe(
      19999,
    );
  });
});
