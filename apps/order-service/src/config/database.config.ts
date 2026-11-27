import { createDatabaseConfig } from '@app/common';
import { OutboxEvent, ProcessedEvent } from '@app/messaging';
import type { DataSourceOptions } from 'typeorm';
import { LOCAL_DATABASE } from '../constants.js';
import { CatalogProduct } from '../entities/catalog-product.entity.js';
import { Coupon } from '../entities/coupon.entity.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { OrderStatusHistory } from '../entities/order-status-history.entity.js';
import { Order } from '../entities/order.entity.js';

/** Database settings shared by the app (modules/database.module.ts) and the TypeORM CLI (config/data-source.ts). */
export function orderDatabaseConfig(): DataSourceOptions {
  return createDatabaseConfig({
    localDatabase: LOCAL_DATABASE,
    entities: [
      Order,
      OrderItem,
      OrderStatusHistory,
      Coupon,
      CatalogProduct,
      OutboxEvent,
      ProcessedEvent,
    ],
  });
}
