import { paiseToRupees } from '@app/common';
import type { ProductUpdatedPayload } from '@app/contracts';
import type { Product } from '../entities/product.entity.js';

/** The full current state of a product, as other services read it from products.events. */
export function toProductUpdatedPayload(product: Product): ProductUpdatedPayload {
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    price: paiseToRupees(product.pricePaise),
    active: product.active,
  };
}
