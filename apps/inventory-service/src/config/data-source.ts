import { DataSource } from 'typeorm';
import { inventoryDatabaseConfig } from './database.config.js';

/**
 * Used only by the TypeORM CLI (the `migration:*:inventory` npm scripts), not
 * by the running app.
 */
export default new DataSource({
  ...inventoryDatabaseConfig(),
  migrations: [`${import.meta.dirname}/../migrations/*.ts`],
});
