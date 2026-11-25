import { orderDatabaseConfig } from '../../src/config/database.config.js';
import { CatalogProduct } from '../../src/entities/catalog-product.entity.js';
import { Coupon } from '../../src/entities/coupon.entity.js';
import { OrderItem } from '../../src/entities/order-item.entity.js';
import { OrderStatusHistory } from '../../src/entities/order-status-history.entity.js';
import { Order } from '../../src/entities/order.entity.js';

describe('orderDatabaseConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses orders_db locally and lists every order entity', () => {
    vi.stubEnv('TYPEORM_DATABASE', '');

    expect(orderDatabaseConfig()).toMatchObject({
      database: 'orders_db',
      entities: [Order, OrderItem, OrderStatusHistory, Coupon, CatalogProduct],
    });
  });
});
