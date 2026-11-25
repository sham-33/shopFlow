import type { ArgumentMetadata } from '@nestjs/common';
import { TrimStringsPipe } from '../../src/validation/trim-strings.pipe.js';

const body: ArgumentMetadata = { type: 'body' };
const query: ArgumentMetadata = { type: 'query' };

describe('TrimStringsPipe', () => {
  const pipe = new TrimStringsPipe();

  it('trims strings at any depth in a body, including inside arrays', () => {
    const input = { name: '  Mug ', tags: [' a ', ' b'], item: { sku: ' SKU-1 ' } };

    expect(pipe.transform(input, body)).toEqual({
      name: 'Mug',
      tags: ['a', 'b'],
      item: { sku: 'SKU-1' },
    });
  });

  it('trims query strings, which Node parses into objects without a prototype', () => {
    const input = Object.assign(Object.create(null) as Record<string, unknown>, {
      search: ' shirt ',
    });

    expect(pipe.transform(input, query)).toEqual({ search: 'shirt' });
  });

  it('never trims a password, at any depth', () => {
    const input = { password: '  pass word  ', user: { password: ' x ' } };

    expect(pipe.transform(input, body)).toEqual(input);
  });

  it('leaves numbers, booleans, null and non-plain objects alone', () => {
    const when = new Date('2026-11-25T00:00:00.000Z');
    const input = { quantity: 5, active: false, note: null, when };

    const output = pipe.transform(input, body) as typeof input;

    expect(output).toEqual(input);
    expect(output.when).toBe(when);
  });

  it.each(['param', 'custom'] as const)('does not touch %s values', (type) => {
    expect(pipe.transform(' id ', { type })).toBe(' id ');
  });
});
