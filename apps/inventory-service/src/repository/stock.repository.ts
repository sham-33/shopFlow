import type { EntityManager } from 'typeorm';

/**
 * The stock counters of products. Every change is one conditional SQL UPDATE,
 * so concurrent orders can never oversell.
 */
export interface StockRepository {
  /**
   * Moves `quantity` units from available to reserved, but only if that many
   * are available:
   *
   *   UPDATE stock SET available_qty = available_qty - n, reserved_qty = reserved_qty + n
   *   WHERE product_id = :id AND available_qty >= n
   *
   * Returns false, changing nothing, when there are fewer units or no stock
   * row for the product. The updated row stays locked until the transaction ends.
   */
  reserve(productId: string, quantity: number, manager?: EntityManager): Promise<boolean>;

  /** `available_qty` by product ID. Products without a stock row are left out. */
  availableQuantities(productIds: string[], manager?: EntityManager): Promise<Map<string, number>>;
}

/** Injection token for StockRepository. */
export const STOCK_REPOSITORY = Symbol('STOCK_REPOSITORY');
