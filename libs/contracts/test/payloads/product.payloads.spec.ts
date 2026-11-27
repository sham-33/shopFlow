import { createEvent } from '../../src/create-event.js';
import { EventType } from '../../src/enums.js';
import { aPayload, FROM_REQUEST } from '../builders/events.builder.js';
import { problemFields } from '../helpers/problem-fields.js';

const { PRODUCT_UPDATED } = EventType;

const problemsWith = (overrides: Record<string, unknown>): string[] =>
  problemFields(() =>
    createEvent(PRODUCT_UPDATED, aPayload(PRODUCT_UPDATED, overrides), FROM_REQUEST),
  );

describe('ProductUpdated payload', () => {
  it.each([
    ['an inactive product', { active: false }],
    ['a free product', { price: 0 }],
    ['the longest SKU and name the services store', { sku: 'S'.repeat(64), name: 'N'.repeat(200) }],
  ])('accepts %s', (_case, overrides) => {
    const payload = aPayload(PRODUCT_UPDATED, overrides);

    expect(() => createEvent(PRODUCT_UPDATED, payload, FROM_REQUEST)).not.toThrow();
  });

  it.each([
    ['a productId that is not a UUID', { productId: 'prd_1' }, ['payload.productId']],
    ['an empty SKU', { sku: '' }, ['payload.sku']],
    ['a SKU longer than 64', { sku: 'S'.repeat(65) }, ['payload.sku']],
    ['an empty name', { name: '' }, ['payload.name']],
    ['a name longer than 200', { name: 'N'.repeat(201) }, ['payload.name']],
    ['a price that is not a number', { price: NaN }, ['payload.price']],
    ['active as a string', { active: 'true' }, ['payload.active']],
    ['a missing active flag', { active: undefined }, ['payload.active']],
  ])('rejects %s', (_case, overrides, fields) => {
    expect(problemsWith(overrides)).toEqual(fields);
  });
});
