import { readEnv } from '../../src/config/env.js';

describe('readEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the variable when it is set', () => {
    vi.stubEnv('SHOPFLOW_TEST_VAR', 'value');

    expect(readEnv('SHOPFLOW_TEST_VAR', { devDefault: 'default' })).toBe('value');
  });

  it('treats an empty value as missing and uses the development default', () => {
    vi.stubEnv('SHOPFLOW_TEST_VAR', '');

    expect(readEnv('SHOPFLOW_TEST_VAR', { devDefault: 'default' })).toBe('default');
  });

  it('ignores the development default in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SHOPFLOW_TEST_VAR', undefined);

    expect(() => readEnv('SHOPFLOW_TEST_VAR', { devDefault: 'default' })).toThrow(
      'Missing required environment variable SHOPFLOW_TEST_VAR',
    );
  });

  it('throws outside production too when there is no default', () => {
    vi.stubEnv('SHOPFLOW_TEST_VAR', undefined);

    expect(() => readEnv('SHOPFLOW_TEST_VAR')).toThrow(
      'Missing required environment variable SHOPFLOW_TEST_VAR',
    );
  });
});
