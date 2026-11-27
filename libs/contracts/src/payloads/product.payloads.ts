import { IsBoolean, IsString, IsUUID, Length } from 'class-validator';
import { PRODUCT_NAME_MAX_LENGTH, SKU_MAX_LENGTH } from '../constants.js';
import { IsRupees } from '../decorators/is-rupees.decorator.js';

// Payloads on Topic.PRODUCTS, written by the inventory service.

/**
 * The full current state of a product, sent when it is created or changed.
 * The topic is compacted, so reading it from the start gives every product's
 * latest state.
 */
export class ProductUpdatedPayload {
  /** Also the Kafka message key. */
  @IsUUID()
  public productId: string;

  @IsString()
  @Length(1, SKU_MAX_LENGTH)
  public sku: string;

  @IsString()
  @Length(1, PRODUCT_NAME_MAX_LENGTH)
  public name: string;

  @IsRupees()
  public price: number;

  /** Inactive products cannot be ordered. */
  @IsBoolean()
  public active: boolean;
}
