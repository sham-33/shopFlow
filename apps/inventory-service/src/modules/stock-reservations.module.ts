import { Module } from '@nestjs/common';
import { STOCK_RESERVATION_REPOSITORY } from '../repository/stock-reservation.repository.js';
import { STOCK_REPOSITORY } from '../repository/stock.repository.js';
import { TypeOrmStockReservationRepository } from '../repository/typeorm-stock-reservation.repository.js';
import { TypeOrmStockRepository } from '../repository/typeorm-stock.repository.js';
import { StockReservationsService } from '../services/stock-reservations.service.js';

/** Reserving stock for orders. Has no HTTP API: it is driven by events. */
@Module({
  providers: [
    StockReservationsService,
    { provide: STOCK_REPOSITORY, useClass: TypeOrmStockRepository },
    {
      provide: STOCK_RESERVATION_REPOSITORY,
      useClass: TypeOrmStockReservationRepository,
    },
  ],
  exports: [StockReservationsService],
})
export class StockReservationsModule {}
