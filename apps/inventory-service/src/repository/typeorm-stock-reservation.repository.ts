import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { StockReservation } from '../entities/stock-reservation.entity.js';
import type { NewReservation, StockReservationRepository } from './stock-reservation.repository.js';

@Injectable()
export class TypeOrmStockReservationRepository implements StockReservationRepository {
  constructor(private readonly dataSource: DataSource) {}

  public insert(
    reservations: NewReservation[],
    manager?: EntityManager,
  ): Promise<StockReservation[]> {
    const repository = (manager ?? this.dataSource.manager).getRepository(StockReservation);
    return repository.save(reservations.map((reservation) => repository.create(reservation)));
  }
}
