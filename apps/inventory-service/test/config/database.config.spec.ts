import { inventoryDatabaseConfig } from '../../src/config/database.config.js';
import { Product } from '../../src/entities/product.entity.js';
import { Stock } from '../../src/entities/stock.entity.js';

describe('inventoryDatabaseConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses inventory_db locally and lists both inventory entities', () => {
    vi.stubEnv('TYPEORM_DATABASE', '');

    expect(inventoryDatabaseConfig()).toMatchObject({
      database: 'inventory_db',
      entities: [Product, Stock],
    });
  });
});
