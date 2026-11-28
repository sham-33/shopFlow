import { createDatabaseConfig } from '@app/common';
import { OutboxEvent, ProcessedEvent } from '@app/messaging';
import type { DataSourceOptions } from 'typeorm';
import { LOCAL_DATABASE } from '../constants.js';
import { Product } from '../entities/product.entity.js';
import { StockReservation } from '../entities/stock-reservation.entity.js';
import { Stock } from '../entities/stock.entity.js';

/** Database settings shared by the app (modules/database.module.ts) and the TypeORM CLI (config/data-source.ts). */
export function inventoryDatabaseConfig(): DataSourceOptions {
  return createDatabaseConfig({
    localDatabase: LOCAL_DATABASE,
    entities: [Product, Stock, StockReservation, OutboxEvent, ProcessedEvent],
  });
}
