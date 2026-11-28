import type { EntityManager } from 'typeorm';
import type { ReservationStatus } from '../domain/enums.js';
import type { StockReservation } from '../entities/stock-reservation.entity.js';

export interface NewReservation {
  orderId: string;
  productId: string;
  quantity: number;
  status: ReservationStatus;
}

/** The stock_reservations rows: which order holds which units. */
export interface StockReservationRepository {
  /** Inserts the rows and returns them with their IDs, in the same order. */
  insert(reservations: NewReservation[], manager?: EntityManager): Promise<StockReservation[]>;
}

/** Injection token for StockReservationRepository. */
export const STOCK_RESERVATION_REPOSITORY = Symbol('STOCK_RESERVATION_REPOSITORY');
