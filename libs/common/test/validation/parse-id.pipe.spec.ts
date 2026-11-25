import { InvalidIdException } from '../../src/exceptions/invalid-id.exception.js';
import { ParseIdPipe } from '../../src/validation/parse-id.pipe.js';

const ID = '33444446-505d-4aaf-b42a-5cbc575a9783';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('returns a valid UUID unchanged', () => {
    expect(pipe.transform(ID, { type: 'param', data: 'id' })).toBe(ID);
  });

  it.each([
    ['a word', 'abc'],
    ['an empty string', ''],
    ['a UUID with extra characters', `${ID}x`],
    ['a number', 42],
  ])('rejects %s with INVALID_ID naming the parameter', (_case, value) => {
    expect(() => pipe.transform(value, { type: 'param', data: 'productId' })).toThrow(
      expect.objectContaining({ code: 'INVALID_ID', details: { parameter: 'productId' } }) as Error,
    );
  });

  it('calls the parameter "id" when it has no name', () => {
    expect(() => pipe.transform('abc', { type: 'param' })).toThrow(InvalidIdException);
    expect(() => pipe.transform('abc', { type: 'param' })).toThrow(
      expect.objectContaining({ details: { parameter: 'id' } }) as Error,
    );
  });
});
