import {
  createDatabaseConfig,
  DATABASE_CONNECT_TIMEOUT_MS,
  DATABASE_IDLE_TIMEOUT_MS,
  DATABASE_POOL_SIZE,
  SLOW_QUERY_MS,
} from '../../src/database/database-config.js';

class SomeEntity {}

const config = () => createDatabaseConfig({ localDatabase: 'some_db', entities: [SomeEntity] });

const VARIABLES = {
  TYPEORM_HOST: 'db.internal',
  TYPEORM_PORT: '6432',
  TYPEORM_USERNAME: 'inventory',
  TYPEORM_PASSWORD: 's3cret',
  TYPEORM_DATABASE: 'inventory_prod',
};

function stubVariables(values: Partial<Record<keyof typeof VARIABLES, string>>): void {
  for (const name of Object.keys(VARIABLES) as (keyof typeof VARIABLES)[]) {
    vi.stubEnv(name, values[name] ?? '');
  }
}

describe('createDatabaseConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the local Docker Postgres outside production when nothing is set', () => {
    stubVariables({});

    expect(config()).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'shopflow',
      password: 'shopflow',
      database: 'some_db',
      entities: [SomeEntity],
    });
  });

  it('reads every TYPEORM_* variable when they are set', () => {
    stubVariables(VARIABLES);

    expect(config()).toMatchObject({
      host: 'db.internal',
      port: 6432,
      username: 'inventory',
      password: 's3cret',
      database: 'inventory_prod',
    });
  });

  it('never changes the schema by itself and uses the tuned pool settings', () => {
    stubVariables({});

    expect(config()).toMatchObject({
      synchronize: false,
      installExtensions: false,
      uuidExtension: 'pgcrypto',
      poolSize: DATABASE_POOL_SIZE,
      connectTimeoutMS: DATABASE_CONNECT_TIMEOUT_MS,
      maxQueryExecutionTime: SLOW_QUERY_MS,
      extra: { idleTimeoutMillis: DATABASE_IDLE_TIMEOUT_MS },
    });
  });

  it.each(Object.keys(VARIABLES))('refuses to start in production without %s', (missing) => {
    vi.stubEnv('NODE_ENV', 'production');
    stubVariables({ ...VARIABLES, [missing]: '' });

    expect(() => config()).toThrow(`Missing required environment variable ${missing}`);
  });

  it.each(['abc', '0', '-1', '5432.5'])('rejects TYPEORM_PORT=%s', (port) => {
    stubVariables({ TYPEORM_PORT: port });

    expect(() => config()).toThrow('TYPEORM_PORT must be a port number');
  });
});
