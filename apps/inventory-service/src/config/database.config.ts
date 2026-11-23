import { readEnv } from '@app/common';
import type { DataSourceOptions } from 'typeorm';
import { Product } from '../entities/product.entity.js';
import { Stock } from '../entities/stock.entity.js';

/**
 * Database settings shared by the app (modules/database.module.ts) and the
 * TypeORM CLI (config/data-source.ts).
 *
 * Outside production, each variable falls back to the local Postgres from
 * docker-compose.yml. In production every one of them is required.
 */
export function inventoryDatabaseConfig(): DataSourceOptions {
  return {
    type: 'postgres',
    host: readEnv('TYPEORM_HOST', { devDefault: 'localhost' }),
    port: readPort('TYPEORM_PORT', '5433'),
    username: readEnv('TYPEORM_USERNAME', { devDefault: 'shopflow' }),
    password: readEnv('TYPEORM_PASSWORD', { devDefault: 'shopflow' }),
    database: readEnv('TYPEORM_DATABASE', { devDefault: 'inventory_db' }),
    entities: [Product, Stock],

    // The schema changes only through migrations, never automatically.
    synchronize: false,
    // gen_random_uuid() is built into Postgres 13+, so no extension is needed.
    uuidExtension: 'pgcrypto',
    installExtensions: false,

    logging: ['error', 'warn'],
    // Queries slower than this are logged as warnings.
    maxQueryExecutionTime: 1000,
    poolSize: 10,
    connectTimeoutMS: 10_000,
    extra: { idleTimeoutMillis: 10_000 },
  };
}

function readPort(name: string, devDefault: string): number {
  const port = Number(readEnv(name, { devDefault }));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${name} must be a port number`);
  }
  return port;
}
