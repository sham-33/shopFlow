import type { DataSourceOptions } from 'typeorm';
import { readEnv } from '../config/env.js';

/** Connections each service keeps open in its pool. */
export const DATABASE_POOL_SIZE = 10;

/** Longest to wait when opening a new connection. */
export const DATABASE_CONNECT_TIMEOUT_MS = 10_000;

/** Idle pooled connections are closed after this long. */
export const DATABASE_IDLE_TIMEOUT_MS = 10_000;

/** Queries slower than this are logged as warnings. */
export const SLOW_QUERY_MS = 1000;

export interface DatabaseConfigOptions {
  /** Database to use outside production when TYPEORM_DATABASE is not set, for example `orders_db`. */
  localDatabase: string;
  /** Every entity class of the service, listed explicitly: the build bundles each app into one file. */
  entities: NonNullable<DataSourceOptions['entities']>;
}

/**
 * Postgres settings shared by every service, read from TYPEORM_HOST,
 * TYPEORM_PORT, TYPEORM_USERNAME, TYPEORM_PASSWORD and TYPEORM_DATABASE.
 *
 * Outside production, each variable falls back to the local Postgres from
 * docker-compose.yml. In production every one of them is required.
 */
export function createDatabaseConfig({
  localDatabase,
  entities,
}: DatabaseConfigOptions): DataSourceOptions {
  return {
    type: 'postgres',
    host: readEnv('TYPEORM_HOST', { devDefault: 'localhost' }),
    port: readPort('TYPEORM_PORT', '5433'),
    username: readEnv('TYPEORM_USERNAME', { devDefault: 'shopflow' }),
    password: readEnv('TYPEORM_PASSWORD', { devDefault: 'shopflow' }),
    database: readEnv('TYPEORM_DATABASE', { devDefault: localDatabase }),
    entities,

    // The schema changes only through migrations, never automatically.
    synchronize: false,
    // gen_random_uuid() is built into Postgres 13+, so no extension is needed.
    uuidExtension: 'pgcrypto',
    installExtensions: false,

    logging: ['error', 'warn'],
    maxQueryExecutionTime: SLOW_QUERY_MS,
    poolSize: DATABASE_POOL_SIZE,
    connectTimeoutMS: DATABASE_CONNECT_TIMEOUT_MS,
    extra: { idleTimeoutMillis: DATABASE_IDLE_TIMEOUT_MS },
  };
}

function readPort(name: string, devDefault: string): number {
  const port = Number(readEnv(name, { devDefault }));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${name} must be a port number`);
  }
  return port;
}
