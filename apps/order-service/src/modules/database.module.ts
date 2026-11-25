import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { orderDatabaseConfig } from '../config/database.config.js';

/**
 * Opens the connection to orders_db. Feature modules register their entities
 * with `TypeOrmModule.forFeature([...])`.
 */
@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: orderDatabaseConfig })],
})
export class DatabaseModule {}
