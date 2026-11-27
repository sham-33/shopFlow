import { toProductUpdatedPayload } from '../../src/mappers/product-event.mapper.js';
import { PRODUCT_ID, aProduct } from '../builders/product.builder.js';

describe('toProductUpdatedPayload', () => {
  it('sends the product’s state with the price in rupees and no stock', () => {
    expect(toProductUpdatedPayload(aProduct())).toEqual({
      productId: PRODUCT_ID,
      sku: 'TSHIRT-RED-M',
      name: 'Red T-shirt (M)',
      price: 499.5,
      active: true,
    });
  });

  it.each([
    [0, 0],
    [1, 0.01],
    [1999, 19.99],
    [999_999_999_999, 9_999_999_999.99],
  ])('turns %s paise into %s rupees exactly', (pricePaise, price) => {
    expect(toProductUpdatedPayload(aProduct({ pricePaise })).price).toBe(price);
  });

  it('sends an inactive product as inactive', () => {
    expect(toProductUpdatedPayload(aProduct({ active: false })).active).toBe(false);
  });
});
