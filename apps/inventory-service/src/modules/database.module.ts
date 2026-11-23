import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { inventoryDatabaseConfig } from '../config/database.config.js';

/**
 * Opens the connection to inventory_db. Feature modules register their
 * entities with `TypeOrmModule.forFeature([...])`.
 */
@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: inventoryDatabaseConfig })],
})
export class DatabaseModule {}
