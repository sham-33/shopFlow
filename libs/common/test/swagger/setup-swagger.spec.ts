import { isSwaggerEnabled } from '../../src/swagger/setup-swagger.js';

describe('isSwaggerEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['outside production', 'development', undefined, true],
    ['in production', 'production', undefined, false],
    ['in production when SWAGGER_ENABLED=true', 'production', 'true', true],
    ['outside production when SWAGGER_ENABLED=false', 'development', 'false', false],
    ['by NODE_ENV when SWAGGER_ENABLED is empty', 'production', '', false],
  ])('is right %s', (_case, nodeEnv, flag, enabled) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.stubEnv('SWAGGER_ENABLED', flag);

    expect(isSwaggerEnabled()).toBe(enabled);
  });
});
