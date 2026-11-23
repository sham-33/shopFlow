export class StockLevelDto {
  /** Units that can still be sold. */
  public available: number;
  /** Units held for orders waiting for payment. */
  public reserved: number;
}

/** What every product endpoint returns. Never the TypeORM entity itself. */
export class ProductResponseDto {
  public id: string;
  public sku: string;
  public name: string;
  /** Price in rupees, for example 499.5. */
  public price: number;
  public active: boolean;
  public stock: StockLevelDto;
  /** ISO 8601 timestamp. */
  public createdAt: string;
  /** ISO 8601 timestamp. */
  public updatedAt: string;
}
