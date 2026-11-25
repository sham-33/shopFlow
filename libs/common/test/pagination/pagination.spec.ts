import { toPage, toSkipTake } from '../../src/pagination/pagination.js';

describe('toSkipTake', () => {
  it.each([
    [1, 20, 0],
    [2, 20, 20],
    [3, 5, 10],
  ])('skips the earlier pages: page %i of %i skips %i rows', (page, limit, skip) => {
    expect(toSkipTake({ page, limit })).toEqual({ skip, take: limit });
  });
});

describe('toPage', () => {
  it.each([
    [0, 20, 0],
    [1, 20, 1],
    [20, 20, 1],
    [21, 20, 2],
    [45, 20, 3],
  ])('counts %i items at %i per page as %i pages', (totalItems, limit, totalPages) => {
    expect(toPage([], totalItems, { page: 1, limit }).meta).toEqual({
      page: 1,
      limit,
      totalItems,
      totalPages,
    });
  });

  it('returns the items it is given', () => {
    const items = ['a', 'b'];

    expect(toPage(items, 2, { page: 1, limit: 20 }).items).toBe(items);
  });
});
