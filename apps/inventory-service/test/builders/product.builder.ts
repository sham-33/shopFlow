import { Product } from '../../src/entities/product.entity.js';
import { Stock } from '../../src/entities/stock.entity.js';

export const PRODUCT_ID = '33444446-505d-4aaf-b42a-5cbc575a9783';

/**
 * A product with its stock, as the repository returns it. Override only the
 * fields a test cares about:
 *
 * @example
 * aProduct({ active: false }, { availableQty: 0 })
 */
export function aProduct(overrides: Partial<Product> = {}, stock: Partial<Stock> = {}): Product {
  const product = Object.assign(new Product(), {
    id: PRODUCT_ID,
    sku: 'TSHIRT-RED-M',
    name: 'Red T-shirt (M)',
    pricePaise: 49950,
    active: true,
    createdAt: new Date('2026-11-23T10:00:00.000Z'),
    updatedAt: new Date('2026-11-23T10:00:00.000Z'),
    ...overrides,
  });
  product.stock = Object.assign(new Stock(), {
    productId: product.id,
    availableQty: 10,
    reservedQty: 0,
    version: 1,
    ...stock,
  });
  return product;
}
