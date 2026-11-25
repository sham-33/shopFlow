import { DataSource } from 'typeorm';
import { orderDatabaseConfig } from './database.config.js';

/**
 * Used only by the TypeORM CLI (the `migration:*:order` npm scripts), not by
 * the running app.
 */
export default new DataSource({
  ...orderDatabaseConfig(),
  migrations: [`${import.meta.dirname}/../migrations/*.ts`],
});
