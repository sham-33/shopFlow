import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCouponDto } from '../../src/dto/create-coupon.dto.js';

/** The fields that fail validation, sorted. */
async function invalidFields(body: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateCouponDto, body));
  return errors.map(({ property }) => property).sort();
}

const IN_A_YEAR = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

describe('CreateCouponDto', () => {
  it.each([
    ['a PERCENTAGE coupon', { code: 'save10', type: 'PERCENTAGE', percentOff: 10 }],
    [
      'a FLAT coupon with a minimum',
      { code: 'FLAT100', type: 'FLAT', amountOff: 100, minOrderAmount: 500 },
    ],
    ['a BOGO coupon', { code: 'BOGO', type: 'BOGO' }],
    ['a coupon that expires in a year', { code: 'XMAS', type: 'BOGO', expiresAt: IN_A_YEAR }],
  ])('accepts %s', async (_case, body) => {
    expect(await invalidFields(body)).toEqual([]);
  });

  it('stores the code in upper case', () => {
    expect(plainToInstance(CreateCouponDto, { code: 'save10' }).code).toBe('SAVE10');
  });

  it('defaults the minimum order amount to 0', () => {
    expect(plainToInstance(CreateCouponDto, { code: 'BOGO', type: 'BOGO' }).minOrderAmount).toBe(0);
  });

  it.each([
    ['PERCENTAGE without percentOff', { code: 'P', type: 'PERCENTAGE' }, ['code', 'percentOff']],
    ['FLAT without amountOff', { code: 'FLAT100', type: 'FLAT' }, ['amountOff']],
    [
      'percentOff on a FLAT coupon',
      { code: 'FLAT100', type: 'FLAT', amountOff: 100, percentOff: 10 },
      ['percentOff'],
    ],
    [
      'amountOff on a PERCENTAGE coupon',
      { code: 'SAVE10', type: 'PERCENTAGE', percentOff: 10, amountOff: 5 },
      ['amountOff'],
    ],
    [
      'either amount on a BOGO coupon',
      { code: 'BOGO', type: 'BOGO', percentOff: 10, amountOff: 5 },
      ['amountOff', 'percentOff'],
    ],
    ['percentOff of 0', { code: 'SAVE0', type: 'PERCENTAGE', percentOff: 0 }, ['percentOff']],
    ['percentOff of 101', { code: 'SAVE101', type: 'PERCENTAGE', percentOff: 101 }, ['percentOff']],
    [
      'a fractional percentOff',
      { code: 'SAVE12', type: 'PERCENTAGE', percentOff: 12.5 },
      ['percentOff'],
    ],
    [
      'amountOff with 3 decimals',
      { code: 'FLAT100', type: 'FLAT', amountOff: 1.005 },
      ['amountOff'],
    ],
    ['amountOff of 0', { code: 'FLAT0', type: 'FLAT', amountOff: 0 }, ['amountOff']],
    ['a negative minimum', { code: 'BOGO', type: 'BOGO', minOrderAmount: -1 }, ['minOrderAmount']],
    [
      'an expiry in the past',
      { code: 'OLD', type: 'BOGO', expiresAt: '2020-01-01T00:00:00Z' },
      ['expiresAt'],
    ],
    [
      'an expiry that is not a date',
      { code: 'OLD', type: 'BOGO', expiresAt: 'tomorrow' },
      ['expiresAt'],
    ],
    ['a code with a dash', { code: 'SAVE-10', type: 'BOGO' }, ['code']],
    ['a 21-character code', { code: 'A'.repeat(21), type: 'BOGO' }, ['code']],
    ['an unknown type', { code: 'FREE', type: 'FREEBIE' }, ['type']],
  ])('rejects %s', async (_case, body, fields) => {
    expect(await invalidFields(body)).toEqual(fields);
  });
});
