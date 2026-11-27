import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { OrderEventPayload } from './order.payloads.js';

// Payloads on Topic.INVENTORY, written by the inventory service.

/** Every item of the order is reserved. */
export class StockReservedPayload extends OrderEventPayload {
  /** One reservation per order item. */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  public reservationIds: string[];
}

/** An item that did not have enough stock. */
export class UnavailableItem {
  @IsUUID()
  public productId: string;

  /** Units the order asked for. */
  @IsInt()
  @Min(1)
  public requested: number;

  /** Units that were available. */
  @IsInt()
  @Min(0)
  public available: number;
}

/** Nothing was reserved, because at least one item did not have enough stock. */
export class StockReservationFailedPayload extends OrderEventPayload {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UnavailableItem)
  public unavailableItems: UnavailableItem[];
}

export class ReleasedItem {
  @IsUUID()
  public productId: string;

  @IsInt()
  @Min(1)
  public quantity: number;
}

/** A cancelled order's reserved stock is available again. */
export class StockReleasedPayload extends OrderEventPayload {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReleasedItem)
  public items: ReleasedItem[];
}
